import React from 'react';
import { Button, ButtonGroup, Chip, Tooltip } from '@nextui-org/react';
import { writeText } from '@tauri-apps/api/clipboard';
import { HiOutlineVolumeUp } from 'react-icons/hi';
import { MdContentCopy } from 'react-icons/md';
import { MdSmartButton } from 'react-icons/md';
import { HiTranslate } from 'react-icons/hi';
import { LuDelete } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { cleanText } from '../handleTextOperations';

/**
 * 工具栏组件
 * 包含朗读、复制、删除换行、清空等功能按钮
 */
const Toolbar = ({
    sourceText,
    detectLanguage,
    setSourceText,
    detect_language,
    syncSourceText,
    handleSpeak,
    toastStyle,
    isTranslateButton = true,
}) => {
    const { t } = useTranslation();

    /**
     * 删除文本中的换行符
     */
    const handleDeleteNewlines = () => {
        if (!sourceText) return;

        const newText = sourceText.replace(/\-\s+/g, '').replace(/\s+/g, ' ');
        setSourceText(newText);
        detect_language(newText).then(() => {
            syncSourceText();
        });
    };

    /**
     * 复制文本到剪贴板
     */
    const handleCopy = () => {
        if (!sourceText) return;
        writeText(sourceText);
    };

    /**
     * 清空文本
     */
    const handleClear = () => {
        setSourceText('');
    };

    /**
     * 执行翻译
     */
    const handleTranslate = () => {
        if (!sourceText) return;

        detect_language(sourceText).then(() => {
            syncSourceText();
        });
    };

    return (
        <div className='flex justify-between px-[12px] p-[5px]'>
            <div className='flex justify-start'>
                <ButtonGroup className='mr-[5px]'>
                    {/* 朗读按钮 */}
                    <Tooltip content={t('translate.speak')}>
                        <Button
                            isIconOnly
                            variant='light'
                            size='sm'
                            isDisabled={!sourceText}
                            onPress={() => {
                                handleSpeak(sourceText, detectLanguage).catch((e) => {
                                    toast.error(e.toString(), { style: toastStyle });
                                });
                            }}
                        >
                            <HiOutlineVolumeUp className='text-[16px]' />
                        </Button>
                    </Tooltip>

                    {/* 复制按钮 */}
                    <Tooltip content={t('translate.copy')}>
                        <Button
                            isIconOnly
                            variant='light'
                            size='sm'
                            isDisabled={!sourceText}
                            onPress={handleCopy}
                        >
                            <MdContentCopy className='text-[16px]' />
                        </Button>
                    </Tooltip>

                    {/* 删除换行按钮 */}
                    <Tooltip content={t('translate.delete_newline')}>
                        <Button
                            isIconOnly
                            variant='light'
                            size='sm'
                            isDisabled={!sourceText}
                            onPress={handleDeleteNewlines}
                        >
                            <MdSmartButton className='text-[16px]' />
                        </Button>
                    </Tooltip>

                    {/* 清空按钮 */}
                    <Tooltip content={t('common.clear')}>
                        <Button
                            variant='light'
                            size='sm'
                            isIconOnly
                            isDisabled={!sourceText}
                            onPress={handleClear}
                        >
                            <LuDelete className='text-[16px]' />
                        </Button>
                    </Tooltip>
                </ButtonGroup>

                {/* 显示检测到的语言标签 */}
                {detectLanguage && (
                    <Chip
                        size='sm'
                        color='secondary'
                        variant='dot'
                        className='my-auto'
                    >
                        {t(`languages.${detectLanguage}`)}
                    </Chip>
                )}
            </div>

            {/* 翻译按钮 */}
            {isTranslateButton && (
                <Tooltip content={t('translate.translate')}>
                    <Button
                        size='sm'
                        color='primary'
                        variant='light'
                        isIconOnly
                        className='text-[14px] font-bold'
                        isDisabled={!sourceText}
                        startContent={<HiTranslate className='text-[16px]' />}
                        onPress={handleTranslate}
                    />
                </Tooltip>
            )}
        </div>
    );
};

export default Toolbar;
