import { Card, Button, CardFooter, Dropdown, DropdownMenu, DropdownTrigger, DropdownItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { BiTransferAlt } from 'react-icons/bi';
import React, { useEffect } from 'react';
import { atom, useAtom, useAtomValue } from 'jotai';

import { languageList } from '../../../../utils/language';
import { detectLanguageAtom } from '../SourceArea';
import { useConfig } from '../../../../hooks';

export const sourceLanguageAtom = atom();
export const targetLanguageAtom = atom();

export default function LanguageArea() {
    const [rememberLanguage] = useConfig('translate_remember_language', false);
    const [translateSourceLanguage, setTranslateSourceLanguage] = useConfig('translate_source_language', 'auto');
    const [translateTargetLanguage, setTranslateTargetLanguage] = useConfig('translate_target_language', 'zh_cn');
    const [translateSecondLanguage] = useConfig('translate_second_language', 'en');

    const [sourceLanguage, setSourceLanguage] = useAtom(sourceLanguageAtom);
    const [targetLanguage, setTargetLanguage] = useAtom(targetLanguageAtom);
    const detectLanguage = useAtomValue(detectLanguageAtom);
    const { t } = useTranslation();

    useEffect(() => {
        if (translateSourceLanguage) {
            setSourceLanguage(translateSourceLanguage);
        }
        if (translateTargetLanguage) {
            setTargetLanguage(translateTargetLanguage);
        }
    }, [translateSourceLanguage, translateTargetLanguage]);

    useEffect(() => {
        if (rememberLanguage !== null && rememberLanguage) {
            setTranslateSourceLanguage(sourceLanguage);
            setTranslateTargetLanguage(targetLanguage);
        }
    }, [sourceLanguage, targetLanguage, rememberLanguage]);

    return (
        <div className='flex items-center justify-center bg-transparent h-[30px] w-full space-x-1'>
            <Dropdown placement='bottom-start'>
                <DropdownTrigger>
                    <Button
                        radius='sm'
                        variant='light'
                        size='sm'
                        className='px-1 min-w-[50px] h-[25px] text-xs'
                    >
                        {t(`languages.${sourceLanguage}`)}
                    </Button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label='Source Language'
                    className='max-h-[50vh] overflow-y-auto'
                    onAction={(key) => {
                        setSourceLanguage(key);
                    }}
                >
                    <DropdownItem key='auto'>{t('languages.auto')}</DropdownItem>
                    {languageList.map((x) => {
                        return <DropdownItem key={x}>{t(`languages.${x}`)}</DropdownItem>;
                    })}
                </DropdownMenu>
            </Dropdown>

            <Button
                isIconOnly
                size='sm'
                variant='light'
                className='text-[14px] h-[25px] min-w-[25px] p-0 mx-[-2px]'
                onPress={async () => {
                    if (sourceLanguage !== 'auto') {
                        const oldSourceLanguage = sourceLanguage;
                        setSourceLanguage(targetLanguage);
                        setTargetLanguage(oldSourceLanguage);
                    } else {
                        if (detectLanguage !== '') {
                            if (targetLanguage === translateTargetLanguage) {
                                setTargetLanguage(detectLanguage);
                            } else {
                                setTargetLanguage(translateTargetLanguage);
                            }
                        } else {
                            if (targetLanguage === translateSecondLanguage) {
                                setTargetLanguage(translateTargetLanguage);
                            } else {
                                setTargetLanguage(translateSecondLanguage);
                            }
                        }
                    }
                }}
            >
                <BiTransferAlt />
            </Button>

            <Dropdown placement='bottom-end'>
                <DropdownTrigger>
                    <Button
                        radius='sm'
                        variant='light'
                        size='sm'
                        className='px-1 min-w-[50px] h-[25px] text-xs'
                    >
                        {t(`languages.${targetLanguage}`)}
                    </Button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label='Target Language'
                    className='max-h-[50vh] overflow-y-auto'
                    onAction={(key) => {
                        setTargetLanguage(key);
                    }}
                >
                    {languageList.map((x) => {
                        return <DropdownItem key={x}>{t(`languages.${x}`)}</DropdownItem>;
                    })}
                </DropdownMenu>
            </Dropdown>
        </div>
    );
}
