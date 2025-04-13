import { Card, CardBody, CardFooter } from '@nextui-org/react';
import React, { useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import toast, { Toaster } from 'react-hot-toast';
import { atom, useAtom } from 'jotai';
import { listen } from '@tauri-apps/api/event';
import { useConfig, useSyncAtom, useVoice, useToastStyle } from '../../../hooks';

// 导入TextEditor和Toolbar组件
import TextEditor from '../../Translate/components/SourceArea/components/TextEditor';
import Toolbar from '../../Translate/components/SourceArea/components/Toolbar';
import {
    detectLanguage as detectLanguageFunc,
    updateSourceText,
} from '../../Translate/components/SourceArea/handleTextOperations';

// 创建原子状态
export const inputSourceTextAtom = atom('');
export const inputDetectLanguageAtom = atom('');

/**
 * 输入翻译窗口的源文本区域组件
 * 简化版本，只用于手动输入文本翻译
 */
export default function InputSourceArea(props) {
    // 获取props
    const { pluginList, serviceInstanceConfigMap } = props;

    // 获取配置项
    const [appFontSize] = useConfig('app_font_size', 16);
    const [sourceText, setSourceText, syncSourceText] = useSyncAtom(inputSourceTextAtom);
    const [detectLanguage, setDetectLanguage] = useAtom(inputDetectLanguageAtom);
    const [dynamicTranslate] = useConfig('dynamic_translate', false);
    const [deleteNewline] = useConfig('translate_delete_newline', false);
    const [ttsServiceList] = useConfig('tts_service_list', ['lingva_tts']);

    // 窗口和UI状态
    const toastStyle = useToastStyle();
    const speak = useVoice();

    // 获取文本更新处理函数
    const { changeSourceText } = updateSourceText(
        sourceText,
        setDetectLanguage,
        setSourceText,
        syncSourceText,
        dynamicTranslate
    );

    // 监听窗口激活事件
    useEffect(() => {
        // 监听窗口激活事件
        const unlisten = listen('activate', () => {
            // 确保文本框获得焦点
            setTimeout(() => {
                const textEditor = document.querySelector('textarea');
                if (textEditor) {
                    textEditor.focus();
                }
            }, 100);
        });

        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    // 获取TTS处理函数
    const handleSpeak = async (text, detectedLang) => {
        if (!text) return;
        try {
            if (!detectedLang) {
                detectedLang = await detectLanguageFunc(text, setDetectLanguage);
            }

            // 使用系统语音API朗读文本
            speak(text, detectedLang || 'auto');
            return true;
        } catch (e) {
            toast.error(e.toString(), { style: toastStyle });
            return false;
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
            detectLanguageFunc(sourceText, setDetectLanguage).then(() => {
                syncSourceText();
            });
        }
    };

    // 包装语言检测功能
    const detect_language = async (text) => {
        return detectLanguageFunc(text, setDetectLanguage);
    };

    // 包装TTS功能
    const handleSpeakWrapper = async (text, detectedLang) => {
        return handleSpeak(text, detectedLang);
    };

    return (
        <div>
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
