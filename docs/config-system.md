# Inpot 应用配置系统文档

## 概述

Inpot 应用采用了一套完整的配置管理系统，用于存储和管理用户偏好设置。本文档详细介绍了配置的存储机制、加载流程以及在应用中的生效方式。

## 配置存储机制

### 技术栈

- **存储技术**：应用使用 Tauri 的 `tauri-plugin-store-api` 插件进行配置数据的持久化存储
- **存储格式**：配置以 JSON 格式保存
- **存储位置**：保存在用户的配置目录中
  - Windows: `%APPDATA%\Roaming\[应用ID]\config.json`
  - macOS: `~/Library/Application Support/[应用ID]/config.json`
  - Linux: `~/.config/[应用ID]/config.json`

### 相关代码文件

- **前端存储接口**：`src/utils/store.js` - 定义了存储初始化和与后端交互的方法
- **配置 Hook**：`src/hooks/useConfig.jsx` - 提供了 React 组件访问和修改配置的能力
- **后端存储管理**：`src-tauri/src/config.rs` - 实现了配置的加载、保存和访问方法

## 配置初始化流程

1. **应用启动**：在 `src/main.jsx` 中，应用首先调用 `initStore()` 函数初始化存储系统
2. **存储初始化**：`initStore()` 函数完成以下工作：
   - 获取应用配置目录路径
   - 创建配置文件路径（如果不存在）
   - 初始化 Store 实例
   - 设置文件监听，当配置文件变化时重新加载
3. **后端初始化**：Rust 后端通过 `init_config()` 函数加载配置文件，并将 Store 实例注册到应用状态中

## 配置访问和修改机制

### React 前端

1. **使用方式**：组件通过 `useConfig` Hook 访问和修改配置
   ```jsx
   const [setting, setSetting] = useConfig('setting_key', 'default_value');
   ```

2. **配置同步流程**：
   - **读取配置**：初始化时从 Store 获取当前值，如果不存在则使用默认值
   - **修改配置**：当调用 `setSetting` 时，新值会：
     1. 立即更新组件状态
     2. 通过 `syncToStore` 函数保存到持久化存储
     3. 通过 Tauri 事件系统发送 `[key]_changed` 事件

3. **配置监听**：
   - 组件会监听与自身关联的配置变更事件
   - 当其他组件或窗口修改了同一配置时，组件会自动更新状态

### Rust 后端

1. **配置访问**：
   - 通过 `get(key)` 函数获取配置值
   - 通过 `set(key, value)` 函数设置配置值

2. **配置重载**：
   - 当配置文件发生变化时，会调用 `reload_store()` 函数重新加载配置
   - 通过 `watch` API 监听配置文件变化，确保应用始终使用最新的配置

## 配置生效机制

1. **实时生效**：
   - 大多数配置在修改后立即生效，无需重启应用
   - 使用 Tauri 的事件系统确保配置变更在所有窗口中同步

2. **特殊配置处理**：
   - **代理设置**：修改后通过 `set_proxy()` 或 `unset_proxy()` 函数直接更改系统环境变量
   - **语言设置**：修改后立即调用 `i18n.changeLanguage()` 更新界面语言
   - **主题设置**：通过 `next-themes` 库的 `setTheme()` 函数立即应用主题变更

3. **服务可用性检查**：
   - 应用通过 `check_service_available()` 函数检查配置中的服务是否可用
   - 不可用的服务会自动从配置列表中移除

## 配置项目示例

以下是一些常用配置项的示例：

```javascript
// 基本设置
const [checkUpdate, setCheckUpdate] = useConfig('check_update', true);
const [serverPort, setServerPort] = useConfig('server_port', 60828);
const [appLanguage, setAppLanguage] = useConfig('app_language', 'en');
const [appTheme, setAppTheme] = useConfig('app_theme', 'system');

// 代理设置
const [proxyEnable, setProxyEnable] = useConfig('proxy_enable', false);
const [proxyHost, setProxyHost] = useConfig('proxy_host', '');
const [proxyPort, setProxyPort] = useConfig('proxy_port', '');

// UI 设置
const [transparent, setTransparent] = useConfig('transparent', true);
const [appFont, setAppFont] = useConfig('app_font', 'default');
const [appFontSize, setAppFontSize] = useConfig('app_font_size', 16);
```

## 最佳实践

1. **使用默认值**：始终为 `useConfig` 提供合理的默认值，确保应用在首次运行时也能正常工作
2. **避免频繁修改**：对于可能频繁变化的设置，考虑使用 debounce 策略减少存储操作
3. **检查配置可用性**：在使用配置值之前验证其可用性，处理配置不存在或无效的情况
