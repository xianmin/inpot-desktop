import { Spacer, Image } from '@nextui-org/react';
import React, { useEffect } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import LanguageArea from '../../window/Translate/components/LanguageArea';
import WindowControl from '../../components/WindowControl';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import { usePluginLoader } from '../../window/Translate/hooks/usePluginLoader';

/**
 * 通用翻译窗口组件，支持不同类型的翻译窗口复用
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.sourceAreaComponent - 源文本区域组件
 * @param {Object} props.sourceAreaProps - 传递给源文本区域组件的属性
 * @param {Object} props.sourceTextAtom - 源文本的Jotai原子状态
 * @param {Object} props.detectLanguageAtom - 检测语言的Jotai原子状态
 * @param {boolean} props.showWindowControl - 是否显示窗口控制按钮
 * @param {React.ReactNode} props.windowHeader - 自定义窗口头部内容
 */
export default function TranslateWindow({
    sourceAreaComponent: SourceAreaComponent,
    sourceAreaProps = {},
    sourceTextAtom,
    detectLanguageAtom,
    showWindowControl = true,
    windowHeader = null,
}) {
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

                    {windowHeader}

                    {showWindowControl && osType !== 'Darwin' && <WindowControl />}
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
                                    <SourceAreaComponent
                                        pluginList={pluginList}
                                        serviceInstanceConfigMap={serviceInstanceConfigMap}
                                        {...sourceAreaProps}
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
                                                                {(dragProvided) => (
                                                                    <div
                                                                        ref={dragProvided.innerRef}
                                                                        {...dragProvided.draggableProps}
                                                                    >
                                                                        <TargetArea
                                                                            {...dragProvided.dragHandleProps}
                                                                            index={index}
                                                                            name={serviceInstanceKey}
                                                                            translateServiceInstanceList={
                                                                                translateServiceInstanceList
                                                                            }
                                                                            pluginList={pluginList}
                                                                            serviceInstanceConfigMap={
                                                                                serviceInstanceConfigMap
                                                                            }
                                                                            sourceTextAtom={sourceTextAtom}
                                                                            detectLanguageAtom={detectLanguageAtom}
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

// 导入这里以避免循环依赖
import TargetArea from '../../window/Translate/components/TargetArea';
