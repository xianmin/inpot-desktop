//! # Inpot 主程序入口
//!
//! 本模块是应用程序的主入口点，负责初始化Tauri应用，
//! 配置插件，设置全局状态，并启动所有必要的服务。

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 自定义模块声明
mod backup;      // 备份功能
mod clipboard;   // 剪贴板功能
mod cmd;         // 命令行功能
mod config;      // 配置管理
mod error;       // 错误处理
mod hotkey;      // 快捷键功能
mod lang_detect; // 语言检测
mod screenshot;  // 屏幕截图
mod server;      // HTTP服务
mod system_ocr;  // 系统OCR
mod tray;        // 系统托盘
mod updater;     // 自动更新
mod window;      // 窗口管理

// 标准库导入
use std::sync::Mutex;

// 第三方库导入
use log::info;
use once_cell::sync::OnceCell;
use tauri::api::notification::Notification;
use tauri::Manager;
use tauri_plugin_log::LogTarget;

// 自定义模块导入
use backup::*;
use clipboard::*;
use cmd::*;
use config::*;
use hotkey::*;
use lang_detect::*;
use screenshot::screenshot;
use server::*;
use system_ocr::*;
use tray::*;
use updater::check_update;
use window::config_window;
use window::updater_window;

/// 全局应用句柄
///
/// 用于在任何地方访问Tauri应用实例，方便操作窗口和发送事件
pub static APP: OnceCell<tauri::AppHandle> = OnceCell::new();

/// 待翻译文本的包装器
///
/// 使用互斥锁包装字符串，用于在不同线程间安全地共享翻译文本
pub struct StringWrapper(pub Mutex<String>);

/// 应用程序主函数
///
/// 初始化Tauri应用，配置插件，设置全局状态，并启动必要的服务
fn main() {
    // 构建Tauri应用
    tauri::Builder::default()
        // 单实例应用插件 - 防止多次启动
        .plugin(tauri_plugin_single_instance::init(|app, _, cwd| {
            Notification::new(&app.config().tauri.bundle.identifier)
                .title("程序已在运行中，请勿重复启动！")
                .body(cwd)
                .icon("pot")
                .show()
                .unwrap();
        }))
        // 日志插件 - 记录应用日志
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([LogTarget::LogDir, LogTarget::Stdout])
                .build(),
        )
        // 自启动插件 - 支持开机自启
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        // SQL插件 - 数据存储
        .plugin(tauri_plugin_sql::Builder::default().build())
        // 存储插件 - 配置存储
        .plugin(tauri_plugin_store::Builder::default().build())
        // 文件监控插件 - 监控文件变化
        .plugin(tauri_plugin_fs_watch::init())
        // 系统托盘
        .system_tray(tauri::SystemTray::new())
        // 应用启动设置
        .setup(|app| {
            info!("============== 启动应用 ==============");

            // macOS特定设置
            #[cfg(target_os = "macos")]
            {
                // 设置为配件模式，避免在Dock中显示
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                // 检查辅助功能权限
                let trusted =
                    macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
                info!("macOS辅助功能权限状态: {}", trusted);
            }

            // 初始化全局应用句柄
            APP.get_or_init(|| app.handle());

            // 初始化配置存储
            info!("初始化配置存储");
            init_config(app);

            // 检查首次运行
            if is_first_run() {
                // 首次运行打开配置窗口
                info!("首次运行，打开配置窗口");
                config_window();
            }

            // 管理翻译文本状态
            app.manage(StringWrapper(Mutex::new("".to_string())));

            // 更新托盘菜单
            update_tray(app.app_handle(), "".to_string(), "".to_string());

            // 启动HTTP服务
            start_server();

            // 注册全局快捷键
            match register_shortcut("all") {
                Ok(()) => {}
                Err(e) => Notification::new(app.config().tauri.bundle.identifier.clone())
                    .title("注册全局快捷键失败")
                    .body(&e)
                    .icon("pot")
                    .show()
                    .unwrap(),
            }

            // 设置代理（如果启用）
            match get("proxy_enable") {
                Some(v) => {
                    if v.as_bool().unwrap() && get("proxy_host").map_or(false, |host| !host.as_str().unwrap().is_empty()) {
                        let _ = set_proxy();
                    }
                }
                None => {}
            }

            // 检查更新
            check_update(app.handle());

            // 初始化语言检测（如果使用本地引擎）
            if let Some(engine) = get("translate_detect_engine") {
                if engine.as_str().unwrap() == "local" {
                    init_lang_detect();
                }
            }

            // 设置剪贴板监控
            let clipboard_monitor = match get("clipboard_monitor") {
                Some(v) => v.as_bool().unwrap(),
                None => {
                    set("clipboard_monitor", false);
                    false
                }
            };
            app.manage(ClipboardMonitorEnableWrapper(Mutex::new(
                clipboard_monitor.to_string(),
            )));
            start_clipboard_monitor(app.handle());

            Ok(())
        })
        // 注册前端可调用的后端函数
        .invoke_handler(tauri::generate_handler![
            // 存储相关
            reload_store,
            // 文本处理
            get_text,
            // 图像处理
            cut_image,
            get_base64,
            copy_img,
            screenshot,
            // OCR功能
            system_ocr,
            // 网络设置
            set_proxy,
            unset_proxy,
            // 系统功能
            run_binary,
            open_devtools,
            // 快捷键
            register_shortcut_by_frontend,
            // 托盘
            update_tray,
            // 窗口
            updater_window,
            // 语言检测
            lang_detect,
            // 云服务
            webdav,
            local,
            // 插件
            install_plugin,
            // 系统
            font_list,
            aliyun
        ])
        // 处理托盘事件
        .on_system_tray_event(tray_event_handler)
        // 构建应用
        .build(tauri::generate_context!())
        .expect("应用启动失败")
        // 窗口关闭不退出，保持后台运行
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
