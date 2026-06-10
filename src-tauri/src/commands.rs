use tauri::State;
use crate::mem_db::MemDb;
use crate::auth::SessionManager;
use crate::models::*;
use crate::services;

#[tauri::command]
pub fn login(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    username: String,
    password: String,
) -> Result<(User, String), String> {
    crate::auth::login(db.inner(), &username, &password, sessions.inner())
}

#[tauri::command]
pub fn get_courses(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
) -> Result<Vec<Course>, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    Ok(services::get_courses(db.inner(), &user))
}

#[tauri::command]
pub fn create_course(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    name: String,
    teacher_name: String,
    description: String,
) -> Result<Course, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    services::create_course(db.inner(), &user, &name, &teacher_name, &description)
}

#[tauri::command]
pub fn delete_course(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    course_id: u64,
) -> Result<(), String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    services::delete_course(db.inner(), &user, course_id)
}

#[tauri::command]
pub fn enroll_course(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    student_id: u64,
    course_id: u64,
) -> Result<Enrollment, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    services::enroll_course(db.inner(), db.inner(), &user, student_id, course_id)
}

#[tauri::command]
pub fn get_enrollments(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    student_id: Option<u64>,
) -> Result<Vec<Enrollment>, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    Ok(services::get_enrollments(db.inner(), &user, student_id))
}

#[tauri::command]
pub fn add_process_record(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    course_id: u64,
    student_id: u64,
    content: String,
) -> Result<ProcessRecord, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    services::add_process_record(db.inner(), &user, course_id, student_id, &content)
}

#[tauri::command]
pub fn get_process_records(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    course_id: u64,
    student_id: Option<u64>,
) -> Result<Vec<ProcessRecord>, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    Ok(services::get_process_records(db.inner(), &user, course_id, student_id))
}

#[tauri::command]
pub fn submit_work(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    course_id: u64,
    student_id: u64,
    description: String,
    file_path: Option<String>,
) -> Result<CourseWork, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    services::submit_work(db.inner(), &user, course_id, student_id, &description, file_path)
}

#[tauri::command]
pub fn get_works(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    course_id: u64,
    student_id: Option<u64>,
) -> Result<Vec<CourseWork>, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    Ok(services::get_works(db.inner(), &user, course_id, student_id))
}

#[tauri::command]
pub fn grade_work(
    db: State<MemDb>,
    sessions: State<SessionManager>,
    token: String,
    work_id: u64,
    grade: f32,
    comment: String,
) -> Result<CourseWork, String> {
    let user = crate::auth::get_user_by_token(db.inner(), sessions.inner(), &token)?;
    services::grade_work(db.inner(), &user, work_id, grade, comment)
}