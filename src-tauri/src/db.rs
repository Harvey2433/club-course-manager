use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub type DbPool = Pool<SqliteConnectionManager>;

/// 当前毫秒时间戳
pub fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// 生成新的实体 id
pub fn new_id() -> String {
    Uuid::new_v4().to_string()
}

/// 创建连接池并初始化数据库结构
pub fn init_pool(db_path: &Path) -> Result<DbPool, String> {
    let manager = SqliteConnectionManager::file(db_path).with_init(|conn| {
        conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
        Ok(())
    });

    let pool = Pool::builder()
        .max_size(8)
        .build(manager)
        .map_err(|e| format!("数据库连接池初始化失败: {e}"))?;

    {
        let conn = pool
            .get()
            .map_err(|e| format!("获取数据库连接失败: {e}"))?;
        create_schema(&conn)?;
    }

    Ok(pool)
}

fn create_schema(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            username_normalized TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            bio TEXT NOT NULL DEFAULT '',
            avatar TEXT,
            role TEXT NOT NULL DEFAULT 'student',
            enterprise_email TEXT NOT NULL DEFAULT '',
            password_hash TEXT NOT NULL,
            managed_club_ids TEXT NOT NULL DEFAULT '[]',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS clubs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            club_id TEXT NOT NULL,
            name TEXT NOT NULL,
            teacher_name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            result_file_name TEXT,
            result_mime_type TEXT,
            result_data_url TEXT,
            result_uploaded_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS enrollments (
            id TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            student_user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            UNIQUE (course_id, student_user_id),
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_courses_club ON courses(club_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        ",
    )
    .map_err(|e| format!("初始化数据库结构失败: {e}"))?;

    Ok(())
}