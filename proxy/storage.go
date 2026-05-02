package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Storage 存储层
type Storage struct {
	db *sql.DB
}

// NewStorage 创建存储实例
func NewStorage(dbPath string) (*Storage, error) {
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// 创建表
	if err := initDB(db); err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	return &Storage{db: db}, nil
}

// Close 关闭数据库连接
func (s *Storage) Close() error {
	return s.db.Close()
}

// initDB 初始化数据库表
func initDB(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS requests (
		id TEXT PRIMARY KEY,
		timestamp INTEGER NOT NULL,
		model TEXT NOT NULL,
		provider TEXT,
		input_tokens INTEGER DEFAULT 0,
		output_tokens INTEGER DEFAULT 0,
		total_tokens INTEGER DEFAULT 0,
		cost_usd REAL DEFAULT 0,
		latency_ms INTEGER DEFAULT 0,
		ttft_ms INTEGER DEFAULT 0,
		status_code INTEGER DEFAULT 200,
		is_error INTEGER DEFAULT 0,
		error_message TEXT,
		stream INTEGER DEFAULT 0,
		user_id TEXT,
		tags TEXT,
		metadata TEXT,
		request_body TEXT,
		response_body TEXT,
		trace_id TEXT,
		parent_span_id TEXT,
		created_at INTEGER DEFAULT (strftime('%s', 'now'))
	);

	CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
	CREATE INDEX IF NOT EXISTS idx_requests_model ON requests(model);
	CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
	CREATE INDEX IF NOT EXISTS idx_requests_is_error ON requests(is_error);
	CREATE INDEX IF NOT EXISTS idx_requests_trace_id ON requests(trace_id);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at INTEGER DEFAULT (strftime('%s', 'now'))
	);
	`

	_, err := db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	// 插入默认设置
	defaultSettings := map[string]string{
		"privacy_level":          "metadata",
		"data_retention_days":    "30",
		"mask_api_keys":          "true",
		"max_request_body_size":  "10240",
	}

	for key, value := range defaultSettings {
		_, err := db.Exec(
			"INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
			key, value,
		)
		if err != nil {
			log.Printf("Warning: failed to insert default setting %s: %v", key, err)
		}
	}

	return nil
}

// InsertRequest 插入请求记录
func (s *Storage) InsertRequest(record *RequestRecord) error {
	query := `
	INSERT INTO requests (
		id, timestamp, model, provider, input_tokens, output_tokens, 
		total_tokens, cost_usd, latency_ms, ttft_ms, status_code, 
		is_error, error_message, stream, user_id, tags, metadata,
		request_body, response_body, trace_id, parent_span_id
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := s.db.Exec(query,
		record.ID,
		record.Timestamp.Unix(),
		record.Model,
		record.Provider,
		record.InputTokens,
		record.OutputTokens,
		record.TotalTokens,
		record.CostUSD,
		record.LatencyMs,
		record.TTFTMs,
		record.StatusCode,
		record.IsError,
		record.ErrorMessage,
		record.Stream,
		record.UserID,
		record.Tags,
		record.Metadata,
		record.RequestBody,
		record.ResponseBody,
		record.TraceID,
		record.ParentSpanID,
	)

	return err
}

// GetRequests 获取请求列表
func (s *Storage) GetRequests(limit, offset int, model, userID string, isError *bool) ([]RequestRecord, int64, error) {
	// 构建查询条件
	where := "1=1"
	args := []interface{}{}

	if model != "" {
		where += " AND model = ?"
		args = append(args, model)
	}
	if userID != "" {
		where += " AND user_id = ?"
		args = append(args, userID)
	}
	if isError != nil {
		if *isError {
			where += " AND is_error = 1"
		} else {
			where += " AND is_error = 0"
		}
	}

	// 获取总数
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM requests WHERE %s", where)
	err := s.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// 获取数据
	query := fmt.Sprintf(`
		SELECT id, timestamp, model, provider, input_tokens, output_tokens,
			total_tokens, cost_usd, latency_ms, ttft_ms, status_code,
			is_error, error_message, stream, user_id, tags, metadata,
			trace_id, parent_span_id
		FROM requests 
		WHERE %s 
		ORDER BY timestamp DESC 
		LIMIT ? OFFSET ?
	`, where)

	args = append(args, limit, offset)
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var records []RequestRecord
	for rows.Next() {
		var r RequestRecord
		var timestamp int64
		var tags, metadata sql.NullString

		err := rows.Scan(
			&r.ID, &timestamp, &r.Model, &r.Provider,
			&r.InputTokens, &r.OutputTokens, &r.TotalTokens,
			&r.CostUSD, &r.LatencyMs, &r.TTFTMs,
			&r.StatusCode, &r.IsError, &r.ErrorMessage,
			&r.Stream, &r.UserID, &tags, &metadata,
			&r.TraceID, &r.ParentSpanID,
		)
		if err != nil {
			return nil, 0, err
		}

		r.Timestamp = time.Unix(timestamp, 0)
		if tags.Valid {
			r.Tags = tags.String
		}
		if metadata.Valid {
			r.Metadata = metadata.String
		}

		records = append(records, r)
	}

	return records, total, nil
}

// GetRequestByID 根据 ID 获取请求
func (s *Storage) GetRequestByID(id string) (*RequestRecord, error) {
	query := `
		SELECT id, timestamp, model, provider, input_tokens, output_tokens,
			total_tokens, cost_usd, latency_ms, ttft_ms, status_code,
			is_error, error_message, stream, user_id, tags, metadata,
			request_body, response_body, trace_id, parent_span_id
		FROM requests 
		WHERE id = ?
	`

	var r RequestRecord
	var timestamp int64
	var tags, metadata, requestBody, responseBody sql.NullString

	err := s.db.QueryRow(query, id).Scan(
		&r.ID, &timestamp, &r.Model, &r.Provider,
		&r.InputTokens, &r.OutputTokens, &r.TotalTokens,
		&r.CostUSD, &r.LatencyMs, &r.TTFTMs,
		&r.StatusCode, &r.IsError, &r.ErrorMessage,
		&r.Stream, &r.UserID, &tags, &metadata,
		&requestBody, &responseBody,
		&r.TraceID, &r.ParentSpanID,
	)
	if err != nil {
		return nil, err
	}

	r.Timestamp = time.Unix(timestamp, 0)
	if tags.Valid {
		r.Tags = tags.String
	}
	if metadata.Valid {
		r.Metadata = metadata.String
	}
	if requestBody.Valid {
		r.RequestBody = requestBody.String
	}
	if responseBody.Valid {
		r.ResponseBody = responseBody.String
	}

	return &r, nil
}

// GetOverview 获取总览数据
func (s *Storage) GetOverview() (*OverviewResponse, error) {
	var resp OverviewResponse

	// 当前数据
	query := `
		SELECT 
			COUNT(*) as total_requests,
			COALESCE(SUM(cost_usd), 0) as total_cost,
			COALESCE(AVG(latency_ms), 0) as avg_latency,
			COALESCE(SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) as error_rate
		FROM requests
	`
	err := s.db.QueryRow(query).Scan(
		&resp.TotalRequests,
		&resp.TotalCostUSD,
		&resp.AvgLatencyMs,
		&resp.ErrorRate,
	)
	if err != nil {
		return nil, err
	}

	// TODO: 计算变化率（与昨天对比）
	resp.RequestsChange = 0
	resp.CostChange = 0
	resp.LatencyChange = 0
	resp.ErrorChange = 0

	return &resp, nil
}

// GetCosts 获取成本分析
func (s *Storage) GetCosts() (*CostAnalysis, error) {
	var analysis CostAnalysis

	// 按模型
	query := `
		SELECT model, SUM(cost_usd) as total_cost, COUNT(*) as request_count, AVG(cost_usd) as avg_cost
		FROM requests
		GROUP BY model
		ORDER BY total_cost DESC
	`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var mc ModelCost
		if err := rows.Scan(&mc.Model, &mc.TotalCostUSD, &mc.RequestCount, &mc.AvgCostUSD); err != nil {
			return nil, err
		}
		analysis.ByModel = append(analysis.ByModel, mc)
	}

	// 按时间（最近 7 天）
	query = `
		SELECT 
			timestamp / 86400 * 86400 as day,
			SUM(cost_usd) as total_cost,
			COUNT(*) as request_count
		FROM requests
		WHERE timestamp > strftime('%s', 'now') - 7 * 86400
		GROUP BY day
		ORDER BY day
	`
	rows, err = s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var tc TimeCost
		var timestamp int64
		if err := rows.Scan(&timestamp, &tc.TotalCostUSD, &tc.RequestCount); err != nil {
			return nil, err
		}
		tc.Timestamp = time.Unix(timestamp, 0)
		analysis.ByTime = append(analysis.ByTime, tc)
	}

	// 按用户
	query = `
		SELECT user_id, SUM(cost_usd) as total_cost, COUNT(*) as request_count
		FROM requests
		WHERE user_id != ''
		GROUP BY user_id
		ORDER BY total_cost DESC
		LIMIT 10
	`
	rows, err = s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var uc UserCost
		if err := rows.Scan(&uc.UserID, &uc.TotalCostUSD, &uc.RequestCount); err != nil {
			return nil, err
		}
		analysis.ByUser = append(analysis.ByUser, uc)
	}

	return &analysis, nil
}

// GetPerformance 获取性能分析
func (s *Storage) GetPerformance() (*PerformanceAnalysis, error) {
	var perf PerformanceAnalysis

	query := `
		SELECT 
			AVG(latency_ms) as avg_latency,
			COALESCE(SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) as error_rate
		FROM requests
	`
	err := s.db.QueryRow(query).Scan(&perf.AvgLatency, &perf.ErrorRate)
	if err != nil {
		return nil, err
	}

	// TODO: 计算 P50, P95, P99
	perf.LatencyP50 = perf.AvgLatency
	perf.LatencyP95 = perf.AvgLatency * 2
	perf.LatencyP99 = perf.AvgLatency * 3
	perf.TTFTP50 = perf.AvgLatency / 4
	perf.TTFTP95 = perf.AvgLatency / 2

	return &perf, nil
}

// GetSettings 获取设置
func (s *Storage) GetSettings() (*Settings, error) {
	var settings Settings

	query := "SELECT key, value FROM settings"
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settingsMap := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		settingsMap[key] = value
	}

	settings.PrivacyLevel = settingsMap["privacy_level"]
	fmt.Sscanf(settingsMap["data_retention_days"], "%d", &settings.DataRetentionDays)
	settings.MaskAPIKeys = settingsMap["mask_api_keys"] == "true"
	fmt.Sscanf(settingsMap["max_request_body_size"], "%d", &settings.MaxRequestBodySize)

	return &settings, nil
}

// UpdateSettings 更新设置
func (s *Storage) UpdateSettings(settings *Settings) error {
	query := `
		INSERT OR REPLACE INTO settings (key, value, updated_at) 
		VALUES (?, ?, strftime('%s', 'now'))
	`

	settingsMap := map[string]string{
		"privacy_level":         settings.PrivacyLevel,
		"data_retention_days":   fmt.Sprintf("%d", settings.DataRetentionDays),
		"mask_api_keys":         fmt.Sprintf("%t", settings.MaskAPIKeys),
		"max_request_body_size": fmt.Sprintf("%d", settings.MaxRequestBodySize),
	}

	for key, value := range settingsMap {
		_, err := s.db.Exec(query, key, value)
		if err != nil {
			return err
		}
	}

	return nil
}
