//! # 窗口管理模块
//!
//! 本模块负责管理应用中所有窗口的创建、配置和控制。
//! 包括翻译窗口、截图窗口、识别窗口、配置窗口等功能窗口的实现。

use crate::config::get;
use crate::config::set;
use crate::StringWrapper;
use crate::APP;
use log::{info, warn};
use std::result::Result;
use tauri::Manager;
use tauri::Monitor;
use tauri::Window;
use tauri::WindowBuilder;
use mouse_position::mouse_position::{Mouse, Position};
#[cfg(any(target_os = "macos", target_os = "windows"))]
use window_shadows::set_shadow;

/// 窗口操作可能遇到的错误类型
#[derive(Debug)]
#[allow(dead_code)]  // 允许未使用的代码，这些变体可能在将来实现中使用
pub enum WindowError {
    /// 获取窗口失败
    GetWindowFailed,
    /// 窗口构建失败
    BuildFailed,
    /// 设置窗口属性失败
    SetPropertyFailed,
}

type WindowResult<T> = Result<T, WindowError>;

// ==================== 基础窗口功能 ====================

/// 获取守护进程窗口实例
///
/// 用于获取当前的守护进程窗口，如果不存在则创建一个新的。
/// 守护进程窗口在后台运行，用于处理非UI任务。
fn get_daemon_window() -> Window {
    let app_handle = APP.get().unwrap();
    match app_handle.get_window("daemon") {
        Some(v) => v,
        None => {
            warn!("守护窗口未找到，创建新的守护窗口！");
            WindowBuilder::new(
                app_handle,
                "daemon",
                tauri::WindowUrl::App("daemon.html".into()),
            )
            .title("Daemon")
            .additional_browser_args("--disable-web-security")
            .visible(false)
            .build()
            .unwrap()
        }
    }
}

/// 获取鼠标当前所在的显示器
///
/// 根据鼠标坐标确定它当前位于哪个显示器上。
/// 如果找不到对应的显示器，则返回主显示器。
///
/// # 参数
///
/// * `x` - 鼠标的X坐标
/// * `y` - 鼠标的Y坐标
///
/// # 返回值
///
/// 返回鼠标所在的显示器实例
fn get_current_monitor(x: i32, y: i32) -> Monitor {
    info!("鼠标位置: {}, {}", x, y);
    let daemon_window = get_daemon_window();
    let monitors = daemon_window.available_monitors().unwrap();

    for m in monitors {
        let size = m.size();
        let position = m.position();

        if x >= position.x
            && x <= (position.x + size.width as i32)
            && y >= position.y
            && y <= (position.y + size.height as i32)
        {
            info!("当前显示器: {:?}", m);
            return m;
        }
    }
    warn!("未找到当前显示器，使用主显示器");
    daemon_window.primary_monitor().unwrap().unwrap()
}

/// 获取当前鼠标位置
///
/// 返回鼠标的当前坐标。如果无法获取，则返回(0,0)
fn get_mouse_position() -> Position {
    match Mouse::get_mouse_position() {
        Mouse::Position { x, y } => Position { x, y },
        Mouse::Error => {
            warn!("无法获取鼠标位置，使用(0, 0)作为默认值");
            Position { x: 0, y: 0 }
        }
    }
}

/// 在鼠标所在的显示器上创建窗口
///
/// 通用的窗口创建功能，可以创建各种类型的窗口。
/// 如果窗口已存在，则返回现有窗口；否则创建一个新窗口。
///
/// # 参数
///
/// * `label` - 窗口的唯一标识
/// * `title` - 窗口标题
///
/// # 返回值
///
/// 返回一个元组，包含窗口实例和一个布尔值，表示窗口是否已经存在
fn build_window(label: &str, title: &str) -> (Window, bool) {
    let mouse_position = get_mouse_position();
    let current_monitor = get_current_monitor(mouse_position.x, mouse_position.y);
    let position = current_monitor.position();

    let app_handle = APP.get().unwrap();
    match app_handle.get_window(label) {
        Some(v) => {
            info!("窗口已存在: {}", label);
            v.set_focus().unwrap();
            (v, true)
        }
        None => {
            info!("窗口不存在，创建新窗口: {}", label);
            let mut builder = tauri::WindowBuilder::new(
                app_handle,
                label,
                tauri::WindowUrl::App("index.html".into()),
            )
            .position(position.x.into(), position.y.into())
            .additional_browser_args("--disable-web-security")
            .focused(true)
            .title(title)
            .visible(false);

            // 针对不同操作系统的窗口配置
            #[cfg(target_os = "macos")]
            {
                builder = builder
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .hidden_title(true);
            }
            #[cfg(not(target_os = "macos"))]
            {
                builder = builder.transparent(true).decorations(false);
            }
            let window = builder.build().unwrap();

            // 除截图窗口外，其他窗口添加阴影效果
            if label != "screenshot" {
                #[cfg(not(target_os = "linux"))]
                set_shadow(&window, true).unwrap_or_default();
            }
            let _ = window.current_monitor();
            (window, false)
        }
    }
}

/// 从配置中获取窗口尺寸
///
/// 从存储中获取指定窗口的尺寸，如果不存在则设置默认值
///
/// # 参数
///
/// * `width_key` - 宽度配置键名
/// * `height_key` - 高度配置键名
/// * `default_width` - 默认宽度值
/// * `default_height` - 默认高度值
///
/// # 返回值
///
/// 返回一个包含宽度和高度的元组
fn get_window_size(width_key: &str, height_key: &str, default_width: i64, default_height: i64) -> (i64, i64) {
    let width = match get(width_key) {
        Some(v) => v.as_i64().unwrap(),
        None => {
            set(width_key, default_width);
            default_width
        }
    };

    let height = match get(height_key) {
        Some(v) => v.as_i64().unwrap(),
        None => {
            set(height_key, default_height);
            default_height
        }
    };

    (width, height)
}

/// 设置窗口的尺寸
///
/// 根据显示器DPI设置窗口的物理尺寸
///
/// # 参数
///
/// * `window` - 要设置尺寸的窗口
/// * `width` - 逻辑宽度
/// * `height` - 逻辑高度
fn set_window_size(window: &Window, width: i64, height: i64) -> WindowResult<()> {
    let monitor = window.current_monitor().unwrap().unwrap();
    let dpi = monitor.scale_factor();

    window
        .set_size(tauri::PhysicalSize::new(
            (width as f64) * dpi,
            (height as f64) * dpi,
        ))
        .map_err(|_| WindowError::SetPropertyFailed)
}

// ==================== 翻译窗口功能 ====================

/// 创建并配置翻译窗口
///
/// 创建一个新的翻译窗口，或返回已存在的窗口。
/// 窗口位置根据配置可以是鼠标附近或固定位置。
///
/// # 返回值
///
/// 返回配置好的翻译窗口实例
fn translate_window() -> Window {
    // 获取或创建翻译窗口
    let mut mouse_position = get_mouse_position();
    let (window, exists) = build_window("translate", "翻译");
    if exists {
        return window;
    }

    // 配置窗口属性
    window.set_skip_taskbar(true).unwrap();

    // 获取窗口尺寸
    let (width, height) = get_window_size(
        "translate_window_width",
        "translate_window_height",
        350,
        420
    );

    // 设置窗口尺寸
    let monitor = window.current_monitor().unwrap().unwrap();
    let dpi = monitor.scale_factor();

    window
        .set_size(tauri::PhysicalSize::new(
            (width as f64) * dpi,
            (height as f64) * dpi,
        ))
        .unwrap();

    // 根据配置设置窗口位置
    let position_type = match get("translate_window_position") {
        Some(v) => v.as_str().unwrap().to_string(),
        None => "mouse".to_string(),
    };

    match position_type.as_str() {
        "mouse" => {
            // 调整窗口位置，确保在屏幕内
            let monitor_size = monitor.size();
            let monitor_size_width = monitor_size.width as f64;
            let monitor_size_height = monitor_size.height as f64;
            let monitor_position = monitor.position();
            let monitor_position_x = monitor_position.x as f64;
            let monitor_position_y = monitor_position.y as f64;

            // 确保窗口不会超出屏幕右边缘
            if mouse_position.x as f64 + width as f64 * dpi
                > monitor_position_x + monitor_size_width
            {
                mouse_position.x -= (width as f64 * dpi) as i32;
                if (mouse_position.x as f64) < monitor_position_x {
                    mouse_position.x = monitor_position_x as i32;
                }
            }

            // 确保窗口不会超出屏幕下边缘
            if mouse_position.y as f64 + height as f64 * dpi
                > monitor_position_y + monitor_size_height
            {
                mouse_position.y -= (height as f64 * dpi) as i32;
                if (mouse_position.y as f64) < monitor_position_y {
                    mouse_position.y = monitor_position_y as i32;
                }
            }

            window
                .set_position(tauri::PhysicalPosition::new(
                    mouse_position.x,
                    mouse_position.y,
                ))
                .unwrap();
        }
        _ => {
            // 使用保存的固定位置
            let position_x = match get("translate_window_position_x") {
                Some(v) => v.as_i64().unwrap(),
                None => 0,
            };
            let position_y = match get("translate_window_position_y") {
                Some(v) => v.as_i64().unwrap(),
                None => 0,
            };
            window
                .set_position(tauri::PhysicalPosition::new(
                    (position_x as f64) * dpi,
                    (position_y as f64) * dpi,
                ))
                .unwrap();
        }
    }

    window
}

/// 选中文本翻译功能
///
/// 获取用户选中的文本并打开翻译窗口进行翻译
pub fn selection_translate() {
    use selection::get_text;
    // 获取选中的文本
    let text = get_text();
    if !text.trim().is_empty() {
        let app_handle = APP.get().unwrap();
        // 将文本写入状态
        let state: tauri::State<StringWrapper> = app_handle.state();
        state.0.lock().unwrap().replace_range(.., &text);
    }

    // 创建或获取翻译窗口并发送文本
    let window = translate_window();
    window.emit("new_text", text).unwrap();
}

/// 手动输入文本翻译功能
///
/// 打开翻译窗口并提示用户输入要翻译的文本
pub fn input_translate() {
    let app_handle = APP.get().unwrap();
    // 检查窗口是否已经存在
    let window_option = app_handle.get_window("translate");

    // 首先设置状态
    let state: tauri::State<StringWrapper> = app_handle.state();
    state
        .0
        .lock()
        .unwrap()
        .replace_range(.., "[INPUT_TRANSLATE_FROM_TRAY]");

    // 如果窗口已存在，直接使用它，避免重复创建
    if let Some(window) = window_option {
        info!("快速显示已存在的翻译窗口");
        // 确保窗口可见
        window.show().unwrap();
        window.set_focus().unwrap();

        // 获取窗口位置配置
        let position_type = match get("translate_window_position") {
            Some(v) => v.as_str().unwrap().to_string(),
            None => "mouse".to_string(),
        };
        if position_type == "mouse" {
            window.center().unwrap();
        }

        // 发送消息到前端，使用特殊标记
        window.emit("new_text", "[INPUT_TRANSLATE_FROM_TRAY]").unwrap();
        return;
    }

    // 如果窗口不存在，创建新窗口
    info!("创建新的翻译窗口");
    let window = translate_window();
    let position_type = match get("translate_window_position") {
        Some(v) => v.as_str().unwrap().to_string(),
        None => "mouse".to_string(),
    };
    if position_type == "mouse" {
        window.center().unwrap();
    }

    window.emit("new_text", "[INPUT_TRANSLATE_FROM_TRAY]").unwrap();
}

/// 特定文本翻译功能
///
/// 打开翻译窗口并翻译指定的文本
///
/// # 参数
///
/// * `text` - 要翻译的文本内容
pub fn text_translate(text: String) {
    let app_handle = APP.get().unwrap();
    // 更新状态
    let state: tauri::State<StringWrapper> = app_handle.state();
    state.0.lock().unwrap().replace_range(.., &text);

    // 创建或获取翻译窗口并发送文本
    let window = translate_window();
    window.emit("new_text", text).unwrap();
}

/// 图片文本翻译功能
///
/// 打开翻译窗口处理图片中的文本
pub fn image_translate() {
    let app_handle = APP.get().unwrap();
    let state: tauri::State<StringWrapper> = app_handle.state();
    state
        .0
        .lock()
        .unwrap()
        .replace_range(.., "[IMAGE_TRANSLATE]");
    let window = translate_window();
    window.emit("new_text", "[IMAGE_TRANSLATE]").unwrap();
}

// ==================== 识别窗口功能 ====================

/// 创建并配置识别窗口
///
/// 用于打开OCR识别窗口，显示图片识别的结果
pub fn recognize_window() {
    let (window, exists) = build_window("recognize", "文字识别");
    if exists {
        window.emit("new_image", "").unwrap();
        return;
    }

    // 获取窗口尺寸
    let (width, height) = get_window_size(
        "recognize_window_width",
        "recognize_window_height",
        800,
        400
    );

    // 设置窗口尺寸
    set_window_size(&window, width, height).unwrap();

    // 将窗口居中显示
    window.center().unwrap();
    window.emit("new_image", "").unwrap();
}

// ==================== 截图窗口功能 ====================

/// 创建并配置截图窗口
///
/// 创建一个全屏的截图窗口，用于用户选择截图区域
///
/// # 返回值
///
/// 返回配置好的截图窗口实例
fn screenshot_window() -> Window {
    let (window, _exists) = build_window("screenshot", "截图");

    window.set_skip_taskbar(true).unwrap();

    // 针对不同操作系统的截图窗口配置
    #[cfg(target_os = "macos")]
    {
        let monitor = window.current_monitor().unwrap().unwrap();
        let size = monitor.size();
        window.set_decorations(false).unwrap();
        window.set_size(*size).unwrap();
    }

    #[cfg(not(target_os = "macos"))]
    window.set_fullscreen(true).unwrap();

    // 截图窗口需要置顶显示
    window.set_always_on_top(true).unwrap();
    window
}

/// OCR文字识别功能
///
/// 打开截图窗口，截图后进入文字识别流程
pub fn ocr_recognize() {
    let window = screenshot_window();
    let window_ = window.clone();
    // 监听截图成功事件，然后打开识别窗口
    window.listen("success", move |event| {
        recognize_window();
        window_.unlisten(event.id())
    });
}

/// OCR文字翻译功能
///
/// 打开截图窗口，截图后进入图片文本翻译流程
pub fn ocr_translate() {
    let window = screenshot_window();
    let window_ = window.clone();
    // 监听截图成功事件，然后打开翻译窗口
    window.listen("success", move |event| {
        image_translate();
        window_.unlisten(event.id())
    });
}

// ==================== 其他窗口功能 ====================

/// 创建并配置配置窗口
///
/// 打开应用的配置窗口，让用户修改应用设置
pub fn config_window() {
    let (window, _exists) = build_window("config", "配置");
    window
        .set_min_size(Some(tauri::LogicalSize::new(800, 400)))
        .unwrap();
    window.set_size(tauri::LogicalSize::new(800, 600)).unwrap();
    window.center().unwrap();
}

/// 创建并配置更新窗口
///
/// 打开应用的更新窗口，显示更新进度和信息
#[tauri::command(async)]
pub fn updater_window() {
    let (window, _exists) = build_window("updater", "更新");
    window
        .set_min_size(Some(tauri::LogicalSize::new(600, 400)))
        .unwrap();
    window.set_size(tauri::LogicalSize::new(600, 400)).unwrap();
    window.center().unwrap();
}
