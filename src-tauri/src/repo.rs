use crate::db::DbPool;
use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension, Row};

fn get_conn(pool: &DbPool) -> Result<r2d2::PooledConnection<r2d2_sqlite::SqliteConnectionManager>, String> {
    pool.get().map_err(|e| format!("获取数据库连接失败: {e}"))
}

fn parse_managed_ids(raw: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
}

fn row_to_user(row: &Row) -> rusqlite::Result<StoredUser> {
    let managed_raw: String = row.get("managed_club_ids")?;
    let role_raw: String = row.get("role")?;
    Ok(StoredUser {
        id: row.get("id")?,
        username: row.get("username")?,
        username_normalized: row.get("username_normalized")?,
        display_name: row.get("display_name")?,
        bio: row.get("bio")?,
        avatar: row.get("avatar")?,
        role: Role::from_str(&role_raw),
        enterprise_email: row.get("enterprise_email")?,
        password_hash: row.get("password_hash")?,
        managed_club_ids: parse_managed_ids(&managed_raw),
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

const USER_COLUMNS: &str = "id, username, username_normalized, display_name, bio, avatar, role, enterprise_email, password_hash, managed_club_ids, created_at, updated_at";

// ---------- 用户 ----------

pub fn insert_user(pool: &DbPool, user: &StoredUser) -> Result<(), String> {
    let conn = get_conn(pool)?;
    let managed = serde_json::to_string(&user.managed_club_ids).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "INSERT INTO users (id, username, username_normalized, display_name, bio, avatar, role, enterprise_email, password_hash, managed_club_ids, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            user.id,
            user.username,
            user.username_normalized,
            user.display_name,
            user.bio,
            user.avatar,
            user.role.as_str(),
            user.enterprise_email,
            user.password_hash,
            managed,
            user.created_at,
            user.updated_at,
        ],
    )
    .map_err(|e| format!("写入用户失败: {e}"))?;
    Ok(())
}

pub fn find_user_by_id(pool: &DbPool, id: &str) -> Result<Option<StoredUser>, String> {
    let conn = get_conn(pool)?;
    let sql = format!("SELECT {USER_COLUMNS} FROM users WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_user)
        .optional()
        .map_err(|e| format!("查询用户失败: {e}"))
}

pub fn find_user_by_normalized(pool: &DbPool, normalized: &str) -> Result<Option<StoredUser>, String> {
    let conn = get_conn(pool)?;
    let sql = format!("SELECT {USER_COLUMNS} FROM users WHERE username_normalized = ?1");
    conn.query_row(&sql, params![normalized], row_to_user)
        .optional()
        .map_err(|e| format!("查询用户失败: {e}"))
}

pub fn list_users(pool: &DbPool) -> Result<Vec<StoredUser>, String> {
    let conn = get_conn(pool)?;
    let sql = format!("SELECT {USER_COLUMNS} FROM users ORDER BY created_at ASC");
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("查询用户失败: {e}"))?;
    let rows = stmt
        .query_map([], row_to_user)
        .map_err(|e| format!("查询用户失败: {e}"))?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("解析用户失败: {e}"))?);
    }
    Ok(result)
}

pub fn count_users(pool: &DbPool) -> Result<i64, String> {
    let conn = get_conn(pool)?;
    conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| format!("统计用户失败: {e}"))
}

pub fn update_user(pool: &DbPool, user: &StoredUser) -> Result<(), String> {
    let conn = get_conn(pool)?;
    let managed = serde_json::to_string(&user.managed_club_ids).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "UPDATE users SET username = ?2, username_normalized = ?3, display_name = ?4, bio = ?5, avatar = ?6, role = ?7, enterprise_email = ?8, password_hash = ?9, managed_club_ids = ?10, updated_at = ?11 WHERE id = ?1",
        params![
            user.id,
            user.username,
            user.username_normalized,
            user.display_name,
            user.bio,
            user.avatar,
            user.role.as_str(),
            user.enterprise_email,
            user.password_hash,
            managed,
            user.updated_at,
        ],
    )
    .map_err(|e| format!("更新用户失败: {e}"))?;
    Ok(())
}

// ---------- session ----------

pub fn insert_session(pool: &DbPool, token: &str, user_id: &str, created_at: i64, expires_at: i64) -> Result<(), String> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)",
        params![token, user_id, created_at, expires_at],
    )
    .map_err(|e| format!("创建会话失败: {e}"))?;
    Ok(())
}

pub fn find_session_user_id(pool: &DbPool, token: &str, now: i64) -> Result<Option<String>, String> {
    let conn = get_conn(pool)?;
    conn.query_row(
        "SELECT user_id FROM sessions WHERE token = ?1 AND expires_at > ?2",
        params![token, now],
        |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("查询会话失败: {e}"))
}

pub fn delete_session(pool: &DbPool, token: &str) -> Result<(), String> {
    let conn = get_conn(pool)?;
    conn.execute("DELETE FROM sessions WHERE token = ?1", params![token])
        .map_err(|e| format!("删除会话失败: {e}"))?;
    Ok(())
}

pub fn delete_expired_sessions(pool: &DbPool, now: i64) -> Result<(), String> {
    let conn = get_conn(pool)?;
    conn.execute("DELETE FROM sessions WHERE expires_at <= ?1", params![now])
        .map_err(|e| format!("清理会话失败: {e}"))?;
    Ok(())
}

// ---------- 社团 ----------

fn row_to_club(row: &Row) -> rusqlite::Result<Club> {
    Ok(Club {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn insert_club(pool: &DbPool, club: &Club) -> Result<(), String> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO clubs (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![club.id, club.name, club.description, club.created_at, club.updated_at],
    )
    .map_err(|e| format!("写入社团失败: {e}"))?;
    Ok(())
}

pub fn list_clubs(pool: &DbPool) -> Result<Vec<Club>, String> {
    let conn = get_conn(pool)?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, created_at, updated_at FROM clubs ORDER BY updated_at DESC")
        .map_err(|e| format!("查询社团失败: {e}"))?;
    let rows = stmt
        .query_map([], row_to_club)
        .map_err(|e| format!("查询社团失败: {e}"))?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("解析社团失败: {e}"))?);
    }
    Ok(result)
}

pub fn find_club(pool: &DbPool, id: &str) -> Result<Option<Club>, String> {
    let conn = get_conn(pool)?;
    conn.query_row(
        "SELECT id, name, description, created_at, updated_at FROM clubs WHERE id = ?1",
        params![id],
        row_to_club,
    )
    .optional()
    .map_err(|e| format!("查询社团失败: {e}"))
}

pub fn club_name_exists(pool: &DbPool, name: &str, exclude_id: Option<&str>) -> Result<bool, String> {
    let conn = get_conn(pool)?;
    let count: i64 = match exclude_id {
        Some(id) => conn.query_row(
            "SELECT COUNT(*) FROM clubs WHERE LOWER(TRIM(name)) = LOWER(TRIM(?1)) AND id != ?2",
            params![name, id],
            |r| r.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*) FROM clubs WHERE LOWER(TRIM(name)) = LOWER(TRIM(?1))",
            params![name],
            |r| r.get(0),
        ),
    }
    .map_err(|e| format!("查询社团失败: {e}"))?;
    Ok(count > 0)
}

pub fn update_club(pool: &DbPool, club: &Club) -> Result<(), String> {
    let conn = get_conn(pool)?;
    conn.execute(
        "UPDATE clubs SET name = ?2, description = ?3, updated_at = ?4 WHERE id = ?1",
        params![club.id, club.name, club.description, club.updated_at],
    )
    .map_err(|e| format!("更新社团失败: {e}"))?;
    Ok(())
}

pub fn delete_club(pool: &DbPool, id: &str) -> Result<(), String> {
    let conn = get_conn(pool)?;
    // 外键级联会删除课程与选课
    conn.execute("DELETE FROM clubs WHERE id = ?1", params![id])
        .map_err(|e| format!("删除社团失败: {e}"))?;
    Ok(())
}

// ---------- 课程 ----------

fn row_to_course(row: &Row) -> rusqlite::Result<Course> {
    let file_name: Option<String> = row.get("result_file_name")?;
    let mime_type: Option<String> = row.get("result_mime_type")?;
    let data_url: Option<String> = row.get("result_data_url")?;
    let uploaded_at: Option<i64> = row.get("result_uploaded_at")?;

    let attachment = match (file_name, mime_type, data_url, uploaded_at) {
        (Some(fname), Some(mime), Some(durl), Some(uat)) => Some(CourseResultAttachment {
            file_name: fname,
            mime_type: mime,
            data_url: durl,
            uploaded_at: uat,
        }),
        _ => None,
    };

    Ok(Course {
        id: row.get("id")?,
        club_id: row.get("club_id")?,
        name: row.get("name")?,
        teacher_name: row.get("teacher_name")?,
        description: row.get("description")?,
        result_attachment: attachment,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

const COURSE_COLUMNS: &str = "id, club_id, name, teacher_name, description, result_file_name, result_mime_type, result_data_url, result_uploaded_at, created_at, updated_at";

pub fn insert_course(pool: &DbPool, course: &Course) -> Result<(), String> {
    let conn = get_conn(pool)?;
    let (fname, mime, durl, uat) = match &course.result_attachment {
        Some(a) => (
            Some(a.file_name.clone()),
            Some(a.mime_type.clone()),
            Some(a.data_url.clone()),
            Some(a.uploaded_at),
        ),
        None => (None, None, None, None),
    };
    conn.execute(
        "INSERT INTO courses (id, club_id, name, teacher_name, description, result_file_name, result_mime_type, result_data_url, result_uploaded_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            course.id, course.club_id, course.name, course.teacher_name, course.description,
            fname, mime, durl, uat, course.created_at, course.updated_at
        ],
    )
    .map_err(|e| format!("写入课程失败: {e}"))?;
    Ok(())
}

pub fn list_courses(pool: &DbPool) -> Result<Vec<Course>, String> {
    let conn = get_conn(pool)?;
    let sql = format!("SELECT {COURSE_COLUMNS} FROM courses ORDER BY created_at DESC");
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("查询课程失败: {e}"))?;
    let rows = stmt
        .query_map([], row_to_course)
        .map_err(|e| format!("查询课程失败: {e}"))?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("解析课程失败: {e}"))?);
    }
    Ok(result)
}

pub fn find_course(pool: &DbPool, id: &str) -> Result<Option<Course>, String> {
    let conn = get_conn(pool)?;
    let sql = format!("SELECT {COURSE_COLUMNS} FROM courses WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_course)
        .optional()
        .map_err(|e| format!("查询课程失败: {e}"))
}

pub fn course_name_exists_in_club(pool: &DbPool, club_id: &str, name: &str, exclude_id: Option<&str>) -> Result<bool, String> {
    let conn = get_conn(pool)?;
    let count: i64 = match exclude_id {
        Some(id) => conn.query_row(
            "SELECT COUNT(*) FROM courses WHERE club_id = ?1 AND LOWER(TRIM(name)) = LOWER(TRIM(?2)) AND id != ?3",
            params![club_id, name, id],
            |r| r.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*) FROM courses WHERE club_id = ?1 AND LOWER(TRIM(name)) = LOWER(TRIM(?2))",
            params![club_id, name],
            |r| r.get(0),
        ),
    }
    .map_err(|e| format!("查询课程失败: {e}"))?;
    Ok(count > 0)
}

pub fn update_course(pool: &DbPool, course: &Course) -> Result<(), String> {
    let conn = get_conn(pool)?;
    let (fname, mime, durl, uat) = match &course.result_attachment {
        Some(a) => (
            Some(a.file_name.clone()),
            Some(a.mime_type.clone()),
            Some(a.data_url.clone()),
            Some(a.uploaded_at),
        ),
        None => (None, None, None, None),
    };
    conn.execute(
        "UPDATE courses SET club_id = ?2, name = ?3, teacher_name = ?4, description = ?5, result_file_name = ?6, result_mime_type = ?7, result_data_url = ?8, result_uploaded_at = ?9, updated_at = ?10 WHERE id = ?1",
        params![
            course.id, course.club_id, course.name, course.teacher_name, course.description,
            fname, mime, durl, uat, course.updated_at
        ],
    )
    .map_err(|e| format!("更新课程失败: {e}"))?;
    Ok(())
}

pub fn delete_course(pool: &DbPool, id: &str) -> Result<(), String> {
    let conn = get_conn(pool)?;
    conn.execute("DELETE FROM courses WHERE id = ?1", params![id])
        .map_err(|e| format!("删除课程失败: {e}"))?;
    Ok(())
}

// ---------- 选课 ----------

fn row_to_enrollment(row: &Row) -> rusqlite::Result<Enrollment> {
    Ok(Enrollment {
        id: row.get("id")?,
        course_id: row.get("course_id")?,
        student_user_id: row.get("student_user_id")?,
        created_at: row.get("created_at")?,
    })
}

pub fn insert_enrollment(pool: &DbPool, enrollment: &Enrollment) -> Result<(), String> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO enrollments (id, course_id, student_user_id, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![enrollment.id, enrollment.course_id, enrollment.student_user_id, enrollment.created_at],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "你已选择该课程，请勿重复选课".to_string()
        } else {
            format!("写入选课记录失败: {e}")
        }
    })?;
    Ok(())
}

pub fn enrollment_exists(pool: &DbPool, course_id: &str, student_user_id: &str) -> Result<bool, String> {
    let conn = get_conn(pool)?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM enrollments WHERE course_id = ?1 AND student_user_id = ?2",
            params![course_id, student_user_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("查询选课失败: {e}"))?;
    Ok(count > 0)
}

pub fn list_enrollments(pool: &DbPool) -> Result<Vec<Enrollment>, String> {
    let conn = get_conn(pool)?;
    let mut stmt = conn
        .prepare("SELECT id, course_id, student_user_id, created_at FROM enrollments ORDER BY created_at DESC")
        .map_err(|e| format!("查询选课失败: {e}"))?;
    let rows = stmt
        .query_map([], row_to_enrollment)
        .map_err(|e| format!("查询选课失败: {e}"))?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("解析选课失败: {e}"))?);
    }
    Ok(result)
}