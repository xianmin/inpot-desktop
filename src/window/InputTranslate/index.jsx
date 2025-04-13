import React from 'react';
import TranslateWindow from '../Translate/TranslateWindow';
import InputSourceArea, { inputSourceTextAtom, inputDetectLanguageAtom } from './components/InputSourceArea';

/**
 * 输入式翻译窗口
 * 简化版本，只用于手动输入文本翻译
 */
export default function InputTranslate() {
    return (
        <TranslateWindow
            sourceAreaComponent={InputSourceArea}
            sourceTextAtom={inputSourceTextAtom}
            detectLanguageAtom={inputDetectLanguageAtom}
        />
    );
}
