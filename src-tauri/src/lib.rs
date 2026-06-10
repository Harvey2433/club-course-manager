mod models;
mod db_trait;
mod mem_db;
mod auth;
mod services;
mod commands;

use mem_db::MemDb;
use auth::SessionManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut mem_db = MemDb::new();
    // 初始化默认用户（admin, teacher, student）
    auth::init_users(&mut mem_db).expect("初始化用户失败");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(mem_db)                     // 注入数据库
        .manage(SessionManager::new())      // 注入会话管理器
        .invoke_handler(tauri::generate_handler![
            commands::login,
            commands::get_courses,
            commands::create_course,
            commands::delete_course,
            commands::enroll_course,
            commands::get_enrollments,
            commands::add_process_record,
            commands::get_process_records,
            commands::submit_work,
            commands::get_works,
            commands::grade_work,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}