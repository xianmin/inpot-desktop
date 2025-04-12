import { Spacer, Button, Image } from '@nextui-org/react';
import React, { useState, useEffect } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { appWindow } from '@tauri-apps/api/window';
import { emit, listen } from '@tauri-apps/api/event';

import LanguageArea from '../Translate/components/LanguageArea';
import SourceArea from '../Translate/components/SourceArea';
import TargetArea from '../Translate/components/TargetArea';
import WindowControl from '../../components/WindowControl';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import { usePluginLoader } from '../Translate/hooks/usePluginLoader';

// 禁止窗口自动关闭功能
let blurTimeout = null;

// 监听focus事件，取消blur超时
void listen('tauri://focus', () => {
    if (blurTimeout) {
        clearTimeout(blurTimeout);
    }
});

export default function InputTranslate() {
    const [rememberWindowSize] = useConfig('input_translate_remember_window_size', true);
    const [translateServiceInstanceList, setTranslateServiceInstanceList] = useConfig('translate_service_list', [
        'deepl',
        'bing',
        'lingva',
        'yandex',
        'google',
        'ecdict',
    ]);
    const [recognizeServiceInstanceList] = useConfig('recognize_service_list', ['system', 'tesseract']);
    const [ttsServiceInstanceList] = useConfig('tts_service_list', ['lingva_tts']);
    const [collectionServiceInstanceList] = useConfig('collection_service_list', []);
    const [hideLanguage] = useConfig('hide_language', false);

    // 插件加载
    const { pluginList, serviceInstanceConfigMap, loadPluginList, loadServiceInstanceConfigMap } = usePluginLoader({
        translateServiceInstanceList,
        recognizeServiceInstanceList,
        ttsServiceInstanceList,
        collectionServiceInstanceList,
    });

    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const items = reorder(translateServiceInstanceList, result.source.index, result.destination.index);
        setTranslateServiceInstanceList(items);
    };

    useEffect(() => {
        loadPluginList();
        loadServiceInstanceConfigMap();
    }, [loadPluginList, loadServiceInstanceConfigMap]);

    useEffect(() => {
        if (
            translateServiceInstanceList !== null &&
            recognizeServiceInstanceList !== null &&
            ttsServiceInstanceList !== null &&
            collectionServiceInstanceList !== null
        ) {
            loadServiceInstanceConfigMap();
        }
    }, [
        translateServiceInstanceList,
        recognizeServiceInstanceList,
        ttsServiceInstanceList,
        collectionServiceInstanceList,
        loadServiceInstanceConfigMap,
    ]);

    return (
        pluginList && (
            <div
                className={`bg-background h-screen w-screen ${
                    osType === 'Linux' && 'rounded-[10px] border-1 border-default-100'
                }`}
            >
                <div
                    data-tauri-drag-region='true'
                    className='fixed top-[5px] left-[5px] right-[5px] h-[30px]'
                />
                <div className={`h-[35px] flex ${osType === 'Darwin' ? 'justify-end' : 'justify-between'}`}>
                    <div className='flex items-center ml-2'>
                        <Image
                            src='/icon.png'
                            alt='InPot Logo'
                            className='w-[20px] h-[20px] mr-2'
                        />
                    </div>

                    {osType !== 'Darwin' && <WindowControl />}
                </div>

                {/* 语言选择区域 */}
                <div className='h-[35px] flex justify-center items-center absolute top-0 left-1/2 -translate-x-1/2 z-50'>
                    <div className='w-[180px]'>
                        <LanguageArea />
                    </div>
                </div>

                <div className={`h-[calc(100vh-${hideLanguage ? '35' : '70'}px)]`}>
                    <div className='h-full overflow-hidden'>
                        <div className='flex flex-row gap-2 h-full'>
                            <div className='w-1/2 pl-[8px]'>
                                {serviceInstanceConfigMap !== null && (
                                    <SourceArea
                                        pluginList={pluginList}
                                        serviceInstanceConfigMap={serviceInstanceConfigMap}
                                    />
                                )}
                            </div>
                            <div className='w-1/2 h-full overflow-y-auto thin-scrollbar'>
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable
                                        droppableId='droppable'
                                        direction='vertical'
                                    >
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                            >
                                                {translateServiceInstanceList !== null &&
                                                    serviceInstanceConfigMap !== null &&
                                                    translateServiceInstanceList.map((serviceInstanceKey, index) => {
                                                        const config =
                                                            serviceInstanceConfigMap[serviceInstanceKey] ?? {};
                                                        const enable = config['enable'] ?? true;

                                                        return enable ? (
                                                            <Draggable
                                                                key={serviceInstanceKey}
                                                                draggableId={serviceInstanceKey}
                                                                index={index}
                                                            >
                                                                {(provided) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                    >
                                                                        <TargetArea
                                                                            {...provided.dragHandleProps}
                                                                            index={index}
                                                                            name={serviceInstanceKey}
                                                                            translateServiceInstanceList={
                                                                                translateServiceInstanceList
                                                                            }
                                                                            pluginList={pluginList}
                                                                            serviceInstanceConfigMap={
                                                                                serviceInstanceConfigMap
                                                                            }
                                                                        />
                                                                        <Spacer y={2} />
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ) : (
                                                            <></>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    );
}
