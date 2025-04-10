import { Card, CardBody, CardHeader, CardFooter, Button } from '@nextui-org/react';
import { BiCollapseVertical, BiExpandVertical } from 'react-icons/bi';
import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs';
import { sendNotification } from '@tauri-apps/api/notification';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { writeText } from '@tauri-apps/api/clipboard';
import PulseLoader from 'react-spinners/PulseLoader';
import { semanticColors } from '@nextui-org/theme';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useAtomValue } from 'jotai';
import { nanoid } from 'nanoid';
import { useSpring, animated } from '@react-spring/web';
import useMeasure from 'react-use-measure';
import { listen } from '@tauri-apps/api/event';

import * as builtinCollectionServices from '../../../../services/collection';
import { sourceLanguageAtom, targetLanguageAtom } from '../LanguageArea';
import { useConfig, useToastStyle, useVoice } from '../../../../hooks';
import { sourceTextAtom, detectLanguageAtom } from '../SourceArea';
import { invoke_plugin } from '../../../../utils/invoke_plugin';
import * as builtinServices from '../../../../services/translate';
import * as builtinTtsServices from '../../../../services/tts';

import { error as logError } from 'tauri-plugin-log-api';
import {
    INSTANCE_NAME_CONFIG_KEY,
    ServiceSourceType,
    getDisplayInstanceName,
    getServiceName,
    getServiceSouceType,
    whetherPluginService,
} from '../../../../utils/service_instance';

// 导入子组件
import TranslateServiceSelector from './components/TranslateServiceSelector';
import TranslateResult from './components/TranslateResult';
import TranslateToolbar from './components/TranslateToolbar';

// 导入工具函数
import { invokeOnce, translateWithPlugin, translateWithBuiltin, handleCollectionService } from './utils/translateUtils';

// 全局存储翻译ID的数组
let translateID = [];

export default function TargetArea(props) {
    const { index, name, translateServiceInstanceList, pluginList, serviceInstanceConfigMap, ...drag } = props;

    // 基础状态
    const [currentTranslateServiceInstanceKey, setCurrentTranslateServiceInstanceKey] = useState(name);
    const [appFontSize] = useConfig('app_font_size', 16);
    const [collectionServiceList] = useConfig('collection_service_list', []);
    const [ttsServiceList] = useConfig('tts_service_list', ['lingva_tts']);
    const [translateSecondLanguage] = useConfig('translate_second_language', 'en');
    const [historyDisable] = useConfig('history_disable', false);
    const [isLoading, setIsLoading] = useState(false);
    const [hide, setHide] = useState(true);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [ttsPluginInfo, setTtsPluginInfo] = useState();

    // Atom 值
    const sourceText = useAtomValue(sourceTextAtom);
    const sourceLanguage = useAtomValue(sourceLanguageAtom);
    const targetLanguage = useAtomValue(targetLanguageAtom);
    const detectLanguage = useAtomValue(detectLanguageAtom);

    // 配置
    const [autoCopy] = useConfig('translate_auto_copy', 'disable');
    const [hideWindow] = useConfig('translate_hide_window', false);
    const [clipboardMonitor] = useConfig('clipboard_monitor', false);

    // Hook
    const { t } = useTranslation();
    const textAreaRef = useRef();
    const toastStyle = useToastStyle();
    const speak = useVoice();
    const theme = useTheme();

    // 动画相关
    const [boundRef, bounds] = useMeasure({ scroll: true });
    const springs = useSpring({
        from: { height: 0 },
        to: { height: hide ? 0 : bounds.height },
    });

    // 记录错误日志
    useEffect(() => {
        if (error) {
            logError(`[${currentTranslateServiceInstanceKey}]happened error: ` + error);
        }
    }, [error, currentTranslateServiceInstanceKey]);

    // 监听窗口隐藏事件，重置翻译结果
    useEffect(() => {
        const unlistenHide = listen('tauri://window-hidden', async () => {
            setResult('');
            setError('');
            setIsLoading(false);
            setHide(true);
        });

        return () => {
            unlistenHide.then((f) => f());
        };
    }, []);

    // 监听翻译源变化，触发翻译
    useEffect(() => {
        setResult('');
        setError('');
        if (
            sourceText.trim() !== '' &&
            sourceLanguage &&
            targetLanguage &&
            autoCopy !== null &&
            hideWindow !== null &&
            clipboardMonitor !== null
        ) {
            if (autoCopy === 'source' && !clipboardMonitor) {
                writeText(sourceText).then(() => {
                    if (hideWindow) {
                        sendNotification({ title: t('common.write_clipboard'), body: sourceText });
                    }
                });
            }
            translate();
        }
    }, [
        sourceText,
        sourceLanguage,
        targetLanguage,
        autoCopy,
        hideWindow,
        currentTranslateServiceInstanceKey,
        clipboardMonitor,
    ]);

    // 自适应文本区域高度
    useEffect(() => {
        if (textAreaRef.current !== null) {
            textAreaRef.current.style.height = '0px';
            if (result !== '') {
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
            }
        }
    }, [result]);

    // 加载 TTS 配置
    useEffect(() => {
        if (ttsServiceList && getServiceSouceType(ttsServiceList[0]) === ServiceSourceType.PLUGIN) {
            readTextFile(`plugins/tts/${getServiceName(ttsServiceList[0])}/info.json`, {
                dir: BaseDirectory.AppConfig,
            }).then((infoStr) => {
                setTtsPluginInfo(JSON.parse(infoStr));
            });
        }
    }, [ttsServiceList]);

    // 翻译方法
    const translate = useCallback(async () => {
        let id = nanoid();
        translateID[index] = id;

        if (whetherPluginService(currentTranslateServiceInstanceKey)) {
            await translateWithPlugin({
                currentTranslateServiceInstanceKey,
                pluginList,
                sourceLanguage,
                targetLanguage,
                detectLanguage,
                translateSecondLanguage,
                sourceText,
                serviceInstanceConfigMap,
                setIsLoading,
                setHide,
                setResult,
                setError,
                index,
                historyDisable,
                autoCopy,
                hideWindow,
                clipboardMonitor,
                t,
            });
        } else {
            await translateWithBuiltin({
                currentTranslateServiceInstanceKey,
                builtinServices,
                sourceLanguage,
                targetLanguage,
                detectLanguage,
                translateSecondLanguage,
                sourceText,
                serviceInstanceConfigMap,
                setIsLoading,
                setHide,
                setResult,
                setError,
                index,
                historyDisable,
                autoCopy,
                hideWindow,
                clipboardMonitor,
                t,
            });
        }
    }, [
        currentTranslateServiceInstanceKey,
        pluginList,
        sourceLanguage,
        targetLanguage,
        detectLanguage,
        translateSecondLanguage,
        sourceText,
        serviceInstanceConfigMap,
        index,
        historyDisable,
        autoCopy,
        hideWindow,
        clipboardMonitor,
        t,
    ]);

    // TTS 语音合成
    const handleSpeak = useCallback(async () => {
        const instanceKey = ttsServiceList[0];
        if (getServiceSouceType(instanceKey) === ServiceSourceType.PLUGIN) {
            const pluginConfig = serviceInstanceConfigMap[instanceKey];
            if (!(targetLanguage in ttsPluginInfo?.language)) {
                throw new Error('Language not supported');
            }
            let [func, utils] = await invoke_plugin('tts', getServiceName(instanceKey));
            let data = await func(result, ttsPluginInfo.language[targetLanguage], {
                config: pluginConfig,
                utils,
            });
            speak(data);
        } else {
            if (!(targetLanguage in builtinTtsServices[getServiceName(instanceKey)].Language)) {
                throw new Error('Language not supported');
            }
            const instanceConfig = serviceInstanceConfigMap[instanceKey];
            let data = await builtinTtsServices[getServiceName(instanceKey)].tts(
                result,
                builtinTtsServices[getServiceName(instanceKey)].Language[targetLanguage],
                {
                    config: instanceConfig,
                }
            );
            speak(data);
        }
    }, [result, ttsServiceList, targetLanguage, serviceInstanceConfigMap, ttsPluginInfo, speak]);

    // 反向翻译
    const handleTranslateBack = useCallback(async () => {
        setError('');
        let newTargetLanguage = sourceLanguage;
        if (sourceLanguage === 'auto') {
            newTargetLanguage = detectLanguage;
        }
        let newSourceLanguage = targetLanguage;
        if (sourceLanguage === 'auto') {
            newSourceLanguage = 'auto';
        }

        if (whetherPluginService(currentTranslateServiceInstanceKey)) {
            const pluginInfo = pluginList['translate'][getServiceName(currentTranslateServiceInstanceKey)];

            if (!(newSourceLanguage in pluginInfo.language && newTargetLanguage in pluginInfo.language)) {
                setError('Language not supported');
                return;
            }

            setIsLoading(true);
            setHide(true);
            const instanceConfig = serviceInstanceConfigMap[currentTranslateServiceInstanceKey];
            instanceConfig['enable'] = 'true';
            const setHideOnce = invokeOnce(setHide);

            try {
                let [func, utils] = await invoke_plugin(
                    'translate',
                    getServiceName(currentTranslateServiceInstanceKey)
                );
                func(result.trim(), pluginInfo.language[newSourceLanguage], pluginInfo.language[newTargetLanguage], {
                    config: instanceConfig,
                    detect: detectLanguage,
                    setResult: (v) => {
                        setResult(v);
                        setHideOnce(false);
                    },
                    utils,
                }).then(
                    (v) => {
                        if (v === result) {
                            setResult(v + ' ');
                        } else {
                            setResult(v.trim());
                        }
                        setIsLoading(false);
                        if (v !== '') {
                            setHideOnce(false);
                        }
                    },
                    (e) => {
                        setError(e.toString());
                        setIsLoading(false);
                    }
                );
            } catch (error) {
                setError(error.toString());
                setIsLoading(false);
            }
        } else {
            const LanguageEnum = builtinServices[getServiceName(currentTranslateServiceInstanceKey)].Language;

            if (!(newSourceLanguage in LanguageEnum && newTargetLanguage in LanguageEnum)) {
                setError('Language not supported');
                return;
            }

            setIsLoading(true);
            setHide(true);
            const instanceConfig = serviceInstanceConfigMap[currentTranslateServiceInstanceKey];
            const setHideOnce = invokeOnce(setHide);

            try {
                builtinServices[getServiceName(currentTranslateServiceInstanceKey)]
                    .translate(result.trim(), LanguageEnum[newSourceLanguage], LanguageEnum[newTargetLanguage], {
                        config: instanceConfig,
                        detect: newSourceLanguage,
                        setResult: (v) => {
                            setResult(v);
                            setHideOnce(false);
                        },
                    })
                    .then(
                        (v) => {
                            if (v === result) {
                                setResult(v + ' ');
                            } else {
                                setResult(v.trim());
                            }
                            setIsLoading(false);
                            if (v !== '') {
                                setHideOnce(false);
                            }
                        },
                        (e) => {
                            setError(e.toString());
                            setIsLoading(false);
                        }
                    );
            } catch (error) {
                setError(error.toString());
                setIsLoading(false);
            }
        }
    }, [
        sourceLanguage,
        targetLanguage,
        detectLanguage,
        currentTranslateServiceInstanceKey,
        pluginList,
        serviceInstanceConfigMap,
        result,
    ]);

    // 错误重试
    const handleRetry = useCallback(() => {
        setError('');
        setResult('');
        translate();
    }, [translate]);

    // 收藏功能
    const handleCollection = useCallback(
        async (collectionServiceInstanceName) => {
            try {
                await handleCollectionService({
                    collectionServiceInstanceName,
                    sourceText,
                    result,
                    serviceInstanceConfigMap,
                    pluginList,
                    builtinCollectionServices,
                    toastStyle,
                    t,
                });

                toast.success(t('translate.add_collection_success'), {
                    style: toastStyle,
                });
            } catch (e) {
                toast.error(e.toString(), { style: toastStyle });
            }
        },
        [sourceText, result, serviceInstanceConfigMap, pluginList, toastStyle, t]
    );

    return (
        <Card
            shadow='none'
            className='rounded-[10px]'
        >
            <Toaster />
            <CardHeader
                className={`flex justify-between py-1 px-0 bg-content2 h-[30px] ${hide ? 'rounded-[10px]' : 'rounded-t-[10px]'}`}
                {...drag}
            >
                {/* 服务选择区域 */}
                <div className='flex'>
                    <TranslateServiceSelector
                        currentTranslateServiceInstanceKey={currentTranslateServiceInstanceKey}
                        translateServiceInstanceList={translateServiceInstanceList}
                        pluginList={pluginList}
                        builtinServices={builtinServices}
                        serviceInstanceConfigMap={serviceInstanceConfigMap}
                        onServiceChange={setCurrentTranslateServiceInstanceKey}
                    />
                    <PulseLoader
                        loading={isLoading}
                        color={theme === 'dark' ? semanticColors.dark.default[500] : semanticColors.light.default[500]}
                        size={8}
                        cssOverride={{
                            display: 'inline-block',
                            margin: 'auto',
                            marginLeft: '20px',
                        }}
                    />
                </div>

                {/* 折叠/展开按钮 */}
                <div className='flex'>
                    <Button
                        size='sm'
                        isIconOnly
                        variant='light'
                        className='h-[20px] w-[20px]'
                        onPress={() => setHide(!hide)}
                    >
                        {hide ? (
                            <BiExpandVertical className='text-[16px]' />
                        ) : (
                            <BiCollapseVertical className='text-[16px]' />
                        )}
                    </Button>
                </div>
            </CardHeader>

            {/* 动画包装的内容区域 */}
            <animated.div style={{ ...springs }}>
                <div ref={boundRef}>
                    {/* 翻译结果 */}
                    <CardBody className={`p-[12px] pb-0 ${hide && 'h-0 p-0'}`}>
                        <TranslateResult
                            ref={textAreaRef}
                            result={result}
                            error={error}
                            appFontSize={appFontSize}
                            speak={speak}
                        />
                    </CardBody>

                    {/* 工具栏 */}
                    <CardFooter
                        className={`bg-content1 rounded-none rounded-b-[10px] flex px-[12px] p-[5px] ${hide && 'hidden'}`}
                    >
                        <TranslateToolbar
                            result={result}
                            error={error}
                            handleSpeak={handleSpeak}
                            toastStyle={toastStyle}
                            handleTranslateBack={handleTranslateBack}
                            handleRetry={handleRetry}
                            collectionServiceList={collectionServiceList}
                            serviceInstanceConfigMap={serviceInstanceConfigMap}
                            pluginList={pluginList}
                            builtinCollectionServices={builtinCollectionServices}
                            sourceText={sourceText}
                            handleCollection={handleCollection}
                        />
                    </CardFooter>
                </div>
            </animated.div>
        </Card>
    );
}
