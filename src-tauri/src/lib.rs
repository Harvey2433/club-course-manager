mod auth;
mod commands;
mod db;
mod models;
mod repo;
mod security;
mod services;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("无法获取数据目录: {e}"))?;
            std::fs::create_dir_all(&data_dir)
                .map_err(|e| format!("无法创建数据目录: {e}"))?;
            let db_path = data_dir.join("club-course-manager.db");

            let pool = db::init_pool(&db_path).map_err(|e| {
                Box::<dyn std::error::Error>::from(e)
            })?;

            // 必须先管理状态，确保任何命令都能拿到 DbPool
            app.manage(pool.clone());

            // 后续初始化失败只记录日志，不中断启动
            if let Err(e) = auth::ensure_builtin_admin(&pool) {
                eprintln!("[WARN] 内置管理员初始化失败: {}", e);
            }
            if let Err(e) = services::ensure_seed_data(&pool) {
                eprintln!("[WARN] 演示数据写入失败: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::register,
            commands::login,
            commands::logout,
            commands::current_user,
            commands::change_password,
            commands::update_profile,
            commands::list_accounts,
            commands::admin_update_account,
            commands::list_clubs,
            commands::create_club,
            commands::update_club,
            commands::delete_club,
            commands::list_courses,
            commands::create_course,
            commands::update_course,
            commands::delete_course,
            commands::upload_course_result,
            commands::remove_course_result,
            commands::enroll_course,
            commands::list_enrollment_views,
            commands::list_ranking,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}