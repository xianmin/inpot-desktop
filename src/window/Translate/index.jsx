import { Button } from '@nextui-org/react';
import { AiFillCloseCircle } from 'react-icons/ai';
import React, { useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';

import TranslateWindow from './TranslateWindow';
import SourceArea from './components/SourceArea';
import { sourceTextAtom, detectLanguageAtom } from './components/SourceArea';
import { useConfig } from '../../hooks';
import { useWindowManager } from './hooks/useWindowManager';

/**
 * 翻译窗口
 * 完整版本，支持选中翻译、图像翻译等功能
 */
export default function Translate() {
    const [closeOnBlur] = useConfig('translate_close_on_blur', true);
    const [windowPosition] = useConfig('translate_window_position', 'mouse');
    const [rememberWindowSize] = useConfig('translate_remember_window_size', false);

    // 窗口管理
    const { listenBlur, unlistenBlur } = useWindowManager({
        closeOnBlur,
        windowPosition,
        rememberWindowSize,
    });

    // 是否自动关闭窗口
    useEffect(() => {
        if (closeOnBlur !== null && !closeOnBlur) {
            unlistenBlur();
        }
    }, [closeOnBlur, unlistenBlur]);

    // 关闭按钮组件
    const closeButton = (
        <Button
            isIconOnly
            size='sm'
            variant='flat'
            disableAnimation
            className={`my-auto bg-transparent`}
            onPress={() => {
                // 点击关闭按钮时只隐藏窗口，不真正关闭
                void appWindow.hide();
            }}
        >
            <AiFillCloseCircle className='text-[20px] text-default-400' />
        </Button>
    );

    return (
        <TranslateWindow
            sourceAreaComponent={SourceArea}
            sourceTextAtom={sourceTextAtom}
            detectLanguageAtom={detectLanguageAtom}
            showWindowControl={false}
            windowHeader={closeButton}
        />
    );
}
