import React, { useEffect, useRef } from 'react';
import { transformVarName } from '../transformVarName';

/**
 * 文本编辑区组件
 * 包含文本输入框和快捷键支持
 */
const TextEditor = ({ sourceText, appFontSize, changeSourceText, keyDownHandler }) => {
    const textAreaRef = useRef();

    // 监听源文本变化，自动调整文本区域高度
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = '50px';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [sourceText]);

    // 添加快捷键支持：Alt+Shift+U 变量名格式转换
    useEffect(() => {
        if (!textAreaRef.current) return;

        const handleKeyDown = async (event) => {
            if (event.altKey && event.shiftKey && event.code === 'KeyU') {
                // 获取原始文本和选中部分
                const originText = textAreaRef.current.value;
                const selectionStart = textAreaRef.current.selectionStart;
                const selectionEnd = textAreaRef.current.selectionEnd;
                const selectionText = originText.substring(selectionStart, selectionEnd);

                if (!selectionText) return;

                // 转换选中的文本
                const convertedText = transformVarName(selectionText);
                const targetText =
                    originText.substring(0, selectionStart) + convertedText + originText.substring(selectionEnd);

                // 更新文本并保持光标位置
                await changeSourceText(targetText);
                textAreaRef.current.selectionStart = selectionStart;
                textAreaRef.current.selectionEnd = selectionStart + convertedText.length;
            }
        };

        textAreaRef.current.addEventListener('keydown', handleKeyDown);
        return () => {
            if (textAreaRef.current) {
                textAreaRef.current.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [textAreaRef, changeSourceText]);

    return (
        <textarea
            autoFocus
            ref={textAreaRef}
            className={`text-[${appFontSize}px] bg-content1 h-full w-full resize-none outline-none cursor-text`}
            value={sourceText}
            onKeyDown={keyDownHandler}
            onChange={(e) => {
                const v = e.target.value;
                changeSourceText(v);
            }}
        />
    );
};

export default TextEditor;
