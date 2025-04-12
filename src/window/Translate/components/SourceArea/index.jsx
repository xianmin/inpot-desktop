import { Card, CardBody, CardFooter } from '@nextui-org/react';
import React, { useEffect, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import toast, { Toaster } from 'react-hot-toast';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api';
import { atom, useAtom } from 'jotai';
import { useConfig, useSyncAtom, useVoice, useToastStyle } from '../../../../hooks';

// 导入拆分出的组件和功能
import TextEditor from './components/TextEditor';
import Toolbar from './components/Toolbar';
import { detectLanguage, cleanText, updateSourceText } from './handleTextOperations';
import useTTS from './useTTS';
import useImageRecognizer from './useImageRecognizer';

// 创建原子状态
export const sourceTextAtom = atom('');
export const detectLanguageAtom = atom('');

// 全局变量
let unlisten = null;

/**
 * 源文本区域组件
 * 用于显示和处理待翻译的文本
 */
export default function SourceArea(props) {
    // 获取props
    const { pluginList, serviceInstanceConfigMap } = props;

    // 获取配置项
    const [appFontSize] = useConfig('app_font_size', 16);
    const [sourceText, setSourceText, syncSourceText] = useSyncAtom(sourceTextAtom);
    const [detectLanguage, setDetectLanguage] = useAtom(detectLanguageAtom);
    const [incrementalTranslate] = useConfig('incremental_translate', false);
    const [dynamicTranslate] = useConfig('dynamic_translate', false);
    const [deleteNewline] = useConfig('translate_delete_newline', false);
    const [recognizeLanguage] = useConfig('recognize_language', 'auto');
    const [recognizeServiceList] = useConfig('recognize_service_list', ['system', 'tesseract']);
    const [ttsServiceList] = useConfig('tts_service_list', ['lingva_tts']);
    const [hideWindow] = useConfig('translate_hide_window', false);
    const [hideSource] = useConfig('hide_source', false);

    // 窗口和UI状态
    const [windowType, setWindowType] = useState('[SELECTION_TRANSLATE]');
    const toastStyle = useToastStyle();
    const speak = useVoice();

    // 获取TTS处理函数
    const { handleSpeak } = useTTS(ttsServiceList, serviceInstanceConfigMap, speak);

    // 获取图像识别处理函数
    const recognizeTextFromImage = useImageRecognizer(
        recognizeLanguage,
        recognizeServiceList,
        pluginList,
        serviceInstanceConfigMap,
        deleteNewline
    );

    // 获取文本更新处理函数
    const { changeSourceText } = updateSourceText(
        sourceText,
        setDetectLanguage,
        setSourceText,
        syncSourceText,
        dynamicTranslate
    );

    /**
     * 处理新文本函数
     * 根据不同的文本类型执行不同的操作
     * @param {string} text - 接收到的文本
     */
    const handleNewText = async (text) => {
        text = text.trim();
        if (hideWindow) {
            appWindow.hide();
        } else {
            appWindow.show();
            appWindow.setFocus();
        }

        // 清空检测语言
        setDetectLanguage('');

        if (text === '[INPUT_TRANSLATE]') {
            // 处理输入翻译模式
            setWindowType('[INPUT_TRANSLATE]');
            appWindow.show();
            appWindow.setFocus();
            setSourceText('', true);
        } else if (text === '[IMAGE_TRANSLATE]') {
            // 处理图像翻译模式
            setWindowType('[IMAGE_TRANSLATE]');

            try {
                // 使用图像识别器获取文本
                const newText = await recognizeTextFromImage();

                // 根据增量翻译配置更新源文本
                if (incrementalTranslate && sourceText) {
                    setSourceText((old) => old + ' ' + newText);
                } else {
                    setSourceText(newText);
                }

                // 检测语言并同步
                await detectLanguage(newText, setDetectLanguage);
                syncSourceText();
            } catch (e) {
                setSourceText(e.toString());
            }
        } else {
            // 处理选择翻译模式（默认模式）
            setWindowType('[SELECTION_TRANSLATE]');

            // 处理文本清理
            const newText = cleanText(text, deleteNewline);

            // 根据增量翻译配置更新源文本
            if (incrementalTranslate && sourceText) {
                setSourceText((old) => old + ' ' + newText);
            } else {
                setSourceText(newText);
            }

            // 检测语言并同步
            await detectLanguage(newText, setDetectLanguage);
            syncSourceText();
        }
    };

    /**
     * 键盘按下事件处理
     * @param {Event} event - 键盘事件
     */
    const keyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            // Enter键开始翻译（不按Shift）
            event.preventDefault();
            detectLanguage(sourceText, setDetectLanguage).then(() => {
                syncSourceText();
            });
        }
        if (event.key === 'Escape') {
            // Escape键隐藏窗口
            appWindow.hide();
        }
    };

    // 监听窗口隐藏配置变化，设置文本监听器
    useEffect(() => {
        if (hideWindow !== null) {
            if (unlisten) {
                unlisten.then((f) => {
                    f();
                });
            }
            // 监听新文本事件
            unlisten = listen('new_text', (event) => {
                appWindow.setFocus();
                handleNewText(event.payload);
            });
        }
    }, [hideWindow]);

    // 监听多个配置变化，初始化并获取文本
    useEffect(() => {
        if (
            deleteNewline !== null &&
            incrementalTranslate !== null &&
            recognizeLanguage !== null &&
            recognizeServiceList !== null &&
            hideWindow !== null
        ) {
            invoke('get_text').then((v) => {
                handleNewText(v);
            });
        }
    }, [deleteNewline, incrementalTranslate, recognizeLanguage, recognizeServiceList, hideWindow]);

    // 包装TTS功能
    const handleSpeakWrapper = async (text, detectedLang) => {
        return handleSpeak(text, detectedLang, setDetectLanguage);
    };

    // 包装语言检测功能
    const detect_language = async (text) => {
        return detectLanguage(text, setDetectLanguage);
    };

    return (
        <div className={hideSource && windowType !== '[INPUT_TRANSLATE]' && 'hidden'}>
            <Card
                shadow='none'
                className='bg-content1 rounded-[10px] mt-[1px] pb-0 h-full'
            >
                <Toaster />
                {/* 卡片主体：文本编辑区 */}
                <CardBody
                    className='bg-content1 p-[12px] h-[calc(100vh-85px)] pb-0 overflow-y-auto cursor-text thin-scrollbar'
                    onClick={(e) => {
                        // 确保点击空白区域时也能聚焦到文本框
                        const textEditor = e.currentTarget.querySelector('textarea');
                        if (textEditor) {
                            textEditor.focus();
                        }
                    }}
                >
                    <TextEditor
                        sourceText={sourceText}
                        appFontSize={appFontSize}
                        changeSourceText={changeSourceText}
                        keyDownHandler={keyDown}
                    />
                </CardBody>

                {/* 卡片底部：工具栏 */}
                <CardFooter className='bg-content1 rounded-none rounded-b-[10px]'>
                    <Toolbar
                        sourceText={sourceText}
                        detectLanguage={detectLanguage}
                        setSourceText={setSourceText}
                        detect_language={detect_language}
                        syncSourceText={syncSourceText}
                        handleSpeak={handleSpeakWrapper}
                        toastStyle={toastStyle}
                    />
                </CardFooter>
            </Card>
        </div>
    );
}
