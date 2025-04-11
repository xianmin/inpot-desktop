import { Spacer, Button } from '@nextui-org/react';
import { AiFillCloseCircle } from 'react-icons/ai';
import React, { useState, useEffect } from 'react';
import { BsPinFill } from 'react-icons/bs';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { appWindow } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';

import LanguageArea from './components/LanguageArea';
import SourceArea from './components/SourceArea';
import TargetArea from './components/TargetArea';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import { useWindowManager } from './hooks/useWindowManager';
import { usePluginLoader } from './hooks/usePluginLoader';

export default function Translate() {
    const [closeOnBlur] = useConfig('translate_close_on_blur', true);
    const [alwaysOnTop] = useConfig('translate_always_on_top', false);
    const [windowPosition] = useConfig('translate_window_position', 'mouse');
    const [rememberWindowSize] = useConfig('translate_remember_window_size', false);
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
    const [pined, setPined] = useState(false);

    // 窗口管理
    const { listenBlur, unlistenBlur } = useWindowManager({
        closeOnBlur,
        alwaysOnTop,
        windowPosition,
        rememberWindowSize,
    });

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

    // 是否自动关闭窗口
    useEffect(() => {
        if (closeOnBlur !== null && !closeOnBlur) {
            unlistenBlur();
        }
    }, [closeOnBlur, unlistenBlur]);

    // 是否默认置顶
    useEffect(() => {
        if (alwaysOnTop !== null && alwaysOnTop) {
            appWindow.setAlwaysOnTop(true);
            unlistenBlur();
            setPined(true);
        }
    }, [alwaysOnTop, unlistenBlur]);

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
                    className='fixed top-0 left-0 right-0 h-[35px]'
                    data-tauri-drag-region='true'
                />
                <div className='h-[35px] w-full flex items-center px-2 relative'>
                    <div className='absolute left-2 z-10'>
                        <Button
                            isIconOnly
                            size='sm'
                            variant='flat'
                            disableAnimation
                            className='bg-transparent'
                            onPress={() => {
                                if (pined) {
                                    if (closeOnBlur) {
                                        listenBlur();
                                    }
                                    appWindow.setAlwaysOnTop(false);
                                } else {
                                    unlistenBlur();
                                    appWindow.setAlwaysOnTop(true);
                                }
                                setPined(!pined);
                            }}
                        >
                            <BsPinFill className={`text-[20px] ${pined ? 'text-primary' : 'text-default-400'}`} />
                        </Button>
                    </div>

                    <div
                        className={`${hideLanguage && 'hidden'} w-full flex justify-center items-center`}
                        data-tauri-drag-region='true'
                    >
                        <div className='w-[180px]'>
                            <LanguageArea />
                        </div>
                    </div>

                    <div className='absolute right-2 z-10'>
                        <Button
                            isIconOnly
                            size='sm'
                            variant='flat'
                            disableAnimation
                            className={`${osType === 'Darwin' && 'hidden'} bg-transparent`}
                            onPress={() => {
                                // 点击关闭按钮时只隐藏窗口，不真正关闭
                                void appWindow.hide();
                                // 触发window-hidden事件，让SourceArea组件知道窗口被隐藏了
                                void emit('tauri://window-hidden', {});
                            }}
                        >
                            <AiFillCloseCircle className='text-[20px] text-default-400' />
                        </Button>
                    </div>
                </div>
                <div className={`h-[calc(100vh-35px)]`}>
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
