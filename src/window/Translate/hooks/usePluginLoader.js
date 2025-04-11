import { useState, useEffect, useCallback } from 'react';
import { readDir, BaseDirectory, readTextFile, exists } from '@tauri-apps/api/fs';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { store } from '../../../utils/store';

export function usePluginLoader({
  translateServiceInstanceList,
  recognizeServiceInstanceList,
  ttsServiceInstanceList,
  collectionServiceInstanceList
}) {
  const [pluginList, setPluginList] = useState(null);
  const [serviceInstanceConfigMap, setServiceInstanceConfigMap] = useState(null);

  // 加载插件列表
  const loadPluginList = useCallback(async () => {
    const serviceTypeList = ['translate', 'tts', 'recognize', 'collection'];
    let temp = {};
    for (const serviceType of serviceTypeList) {
      temp[serviceType] = {};
      if (await exists(`plugins/${serviceType}`, { dir: BaseDirectory.AppConfig })) {
        const plugins = await readDir(`plugins/${serviceType}`, { dir: BaseDirectory.AppConfig });
        for (const plugin of plugins) {
          const infoStr = await readTextFile(`plugins/${serviceType}/${plugin.name}/info.json`, {
            dir: BaseDirectory.AppConfig,
          });
          let pluginInfo = JSON.parse(infoStr);
          if ('icon' in pluginInfo) {
            const appConfigDirPath = await appConfigDir();
            const iconPath = await join(
              appConfigDirPath,
              `/plugins/${serviceType}/${plugin.name}/${pluginInfo.icon}`
            );
            pluginInfo.icon = convertFileSrc(iconPath);
          }
          temp[serviceType][plugin.name] = pluginInfo;
        }
      }
    }
    setPluginList({ ...temp });
  }, []);

  // 加载服务配置
  const loadServiceInstanceConfigMap = useCallback(async () => {
    if (
      !translateServiceInstanceList ||
      !recognizeServiceInstanceList ||
      !ttsServiceInstanceList ||
      !collectionServiceInstanceList
    ) {
      return;
    }

    const config = {};
    for (const serviceInstanceKey of translateServiceInstanceList) {
      config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
    }
    for (const serviceInstanceKey of recognizeServiceInstanceList) {
      config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
    }
    for (const serviceInstanceKey of ttsServiceInstanceList) {
      config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
    }
    for (const serviceInstanceKey of collectionServiceInstanceList) {
      config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
    }
    setServiceInstanceConfigMap({ ...config });
  }, [
    translateServiceInstanceList,
    recognizeServiceInstanceList,
    ttsServiceInstanceList,
    collectionServiceInstanceList
  ]);

  // 监听插件重新加载事件
  useEffect(() => {
    const unlistenPromise = listen('reload_plugin_list', loadPluginList);
    return () => {
      unlistenPromise.then(f => f());
    };
  }, [loadPluginList]);

  return {
    pluginList,
    serviceInstanceConfigMap,
    loadPluginList,
    loadServiceInstanceConfigMap
  };
}
