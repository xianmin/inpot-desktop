import { invoke } from '@tauri-apps/api';
import * as recognizeServices from '../../../../services/recognize';
import { invoke_plugin } from '../../../../utils/invoke_plugin';
import { getServiceName, getServiceSouceType, ServiceSourceType } from '../../../../utils/service_instance';
import { cleanText } from './handleTextOperations';

/**
 * 图像文本识别处理函数
 * @param {string} recognizeLanguage - 识别语言
 * @param {Array} recognizeServiceList - 识别服务列表
 * @param {Object} pluginList - 插件列表
 * @param {Object} serviceInstanceConfigMap - 服务实例配置映射
 * @param {boolean} deleteNewline - 是否删除换行符
 * @returns {Function} - 图像识别处理函数
 */
export const useImageRecognizer = (
  recognizeLanguage,
  recognizeServiceList,
  pluginList,
  serviceInstanceConfigMap,
  deleteNewline
) => {
  /**
   * 从图像中识别文本
   * @returns {Promise<string>} - 识别的文本
   */
  const recognizeTextFromImage = async () => {
    // 获取图像的base64编码
    const base64 = await invoke('get_base64');
    // 获取第一个识别服务
    const serviceInstanceKey = recognizeServiceList[0];

    if (getServiceSouceType(serviceInstanceKey) === ServiceSourceType.PLUGIN) {
      // 使用插件识别文本
      const pluginName = getServiceName(serviceInstanceKey);
      if (!pluginList ||
        !pluginList['recognize'] ||
        !pluginList['recognize'][pluginName] ||
        !(recognizeLanguage in pluginList['recognize'][pluginName].language)) {
        throw new Error('语言不受支持');
      }

      const pluginConfig = serviceInstanceConfigMap[serviceInstanceKey];
      let [func, utils] = await invoke_plugin('recognize', pluginName);

      const result = await func(
        base64,
        pluginList['recognize'][pluginName].language[recognizeLanguage],
        {
          config: pluginConfig,
          utils,
        }
      );

      return cleanText(result, deleteNewline);
    } else {
      // 使用内置服务识别文本
      const serviceName = getServiceName(serviceInstanceKey);
      if (!recognizeServices[serviceName] ||
        !(recognizeLanguage in recognizeServices[serviceName].Language)) {
        throw new Error('语言不受支持');
      }

      const instanceConfig = serviceInstanceConfigMap[serviceInstanceKey];
      const result = await recognizeServices[serviceName].recognize(
        base64,
        recognizeServices[serviceName].Language[recognizeLanguage],
        {
          config: instanceConfig,
        }
      );

      return cleanText(result, deleteNewline);
    }
  };

  return recognizeTextFromImage;
};

export default useImageRecognizer;
