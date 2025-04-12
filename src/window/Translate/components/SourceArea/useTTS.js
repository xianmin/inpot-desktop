import { useEffect, useState } from 'react';
import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs';
import detect from '../../../../utils/lang_detect';
import { invoke_plugin } from '../../../../utils/invoke_plugin';
import * as builtinTtsServices from '../../../../services/tts';
import { getServiceName, getServiceSouceType, ServiceSourceType } from '../../../../utils/service_instance';

/**
 * 文本转语音服务钩子
 * @param {Array} ttsServiceList - TTS服务列表
 * @param {Object} serviceInstanceConfigMap - 服务实例配置映射
 * @param {Function} speakFn - 语音播放函数
 * @returns {Object} - TTS服务相关的状态和方法
 */
export const useTTS = (ttsServiceList, serviceInstanceConfigMap, speakFn) => {
  const [ttsPluginInfo, setTtsPluginInfo] = useState();

  // 监听TTS服务列表变化，加载TTS插件信息
  useEffect(() => {
    if (ttsServiceList && getServiceSouceType(ttsServiceList[0]) === ServiceSourceType.PLUGIN) {
      readTextFile(`plugins/tts/${getServiceName(ttsServiceList[0])}/info.json`, {
        dir: BaseDirectory.AppConfig,
      }).then((infoStr) => {
        setTtsPluginInfo(JSON.parse(infoStr));
      });
    }
  }, [ttsServiceList]);

  /**
   * 文本朗读处理函数
   * @param {string} text - 要朗读的文本
   * @param {string} currentDetectedLang - 已检测的语言，如果为空将重新检测
   * @param {Function} setDetectLanguage - 设置检测语言的函数
   */
  const handleSpeak = async (text, currentDetectedLang, setDetectLanguage) => {
    if (!text || !ttsServiceList || !ttsServiceList.length) {
      throw new Error('无法朗读文本：文本为空或无可用TTS服务');
    }

    // 获取第一个TTS服务
    const instanceKey = ttsServiceList[0];
    let detected = currentDetectedLang;

    // 如果未检测语言，先检测
    if (detected === '') {
      detected = await detect(text);
      setDetectLanguage(detected);
    }

    // 根据服务类型调用不同的TTS服务
    if (getServiceSouceType(instanceKey) === ServiceSourceType.PLUGIN) {
      // 使用插件TTS服务
      if (!ttsPluginInfo || !(detected in ttsPluginInfo.language)) {
        throw new Error('语言不受支持');
      }

      const pluginConfig = serviceInstanceConfigMap[instanceKey];
      let [func, utils] = await invoke_plugin('tts', getServiceName(instanceKey));
      let data = await func(text, ttsPluginInfo.language[detected], {
        config: pluginConfig,
        utils,
      });

      speakFn(data);
    } else {
      // 使用内置TTS服务
      const serviceName = getServiceName(instanceKey);

      if (!(detected in builtinTtsServices[serviceName].Language)) {
        throw new Error('语言不受支持');
      }

      const instanceConfig = serviceInstanceConfigMap[instanceKey];
      let data = await builtinTtsServices[serviceName].tts(
        text,
        builtinTtsServices[serviceName].Language[detected],
        {
          config: instanceConfig,
        }
      );

      speakFn(data);
    }
  };

  return {
    ttsPluginInfo,
    handleSpeak
  };
};

export default useTTS;
