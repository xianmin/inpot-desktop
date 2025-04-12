import { Spacer, Button, Image } from '@nextui-org/react';
import { AiFillCloseCircle } from 'react-icons/ai';
import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { BsPinFill } from 'react-icons/bs';

import LanguageArea from './components/LanguageArea';
import SourceArea from './components/SourceArea';
import TargetArea from './components/TargetArea';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import { store } from '../../utils/store';
import { info } from 'tauri-plugin-log-api';
import { useWindowManager } from './hooks/useWindowManager';
import { usePluginLoader } from './hooks/usePluginLoader';
import { appWindow } from '@tauri-apps/api/window';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

let blurTimeout = null;
let resizeTimeout = null;
let moveTimeout = null;

const listenBlur = () => {
    return listen('tauri://blur', () => {
        if (appWindow.label === 'translate') {
            if (blurTimeout) {
                clearTimeout(blurTimeout);
            }
            info('Blur');
            // 100ms后隐藏窗口，而不是关闭它
            // 因为在 windows 下拖动窗口时会先切换成 blur 再立即切换成 focus
            blurTimeout = setTimeout(async () => {
                info('Hiding window instead of closing');
                // 仅隐藏窗口，不关闭
                await appWindow.hide();
            }, 100);
        }
    });
};

let unlisten = listenBlur();
// 取消 blur 监听
const unlistenBlur = () => {
    unlisten.then((f) => {
        f();
    });
};

// 监听 focus 事件取消 blurTimeout 时间之内的关闭窗口
void listen('tauri://focus', () => {
    info('Focus');
    if (blurTimeout) {
        info('Cancel Close');
        clearTimeout(blurTimeout);
    }
});
// 监听 move 事件取消 blurTimeout 时间之内的关闭窗口
void listen('tauri://move', () => {
    info('Move');
    if (blurTimeout) {
        info('Cancel Close');
        clearTimeout(blurTimeout);
    }
});

export default function Translate() {
    const [closeOnBlur] = useConfig('translate_close_on_blur', true);
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

    // 窗口管理
    const { listenBlur, unlistenBlur } = useWindowManager({
        closeOnBlur,
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
                <div className={`h-[35px] flex justify-end`}>
                    <Button
                        isIconOnly
                        size='sm'
                        variant='flat'
                        disableAnimation
                        className={`my-auto ${osType === 'Darwin' && 'hidden'} bg-transparent`}
                        onPress={() => {
                            // 点击关闭按钮时只隐藏窗口，不真正关闭
                            void appWindow.hide();
                        }}
                    >
                        <AiFillCloseCircle className='text-[20px] text-default-400' />
                    </Button>
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
