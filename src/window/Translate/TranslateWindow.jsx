import { Spacer, Image } from '@nextui-org/react';
import React, { useEffect, lazy, Suspense, memo } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import WindowControl from '../../components/WindowControl';
import { usePluginLoader } from './hooks/usePluginLoader';
import LanguageArea from './components/LanguageArea';
// 使用lazy导入TargetArea组件，解决循环依赖问题
const TargetArea = lazy(() => import('./components/TargetArea'));

// 窗口标题栏组件
const TitleBar = memo(({ showWindowControl, windowHeader }) => (
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
));

// 语言选择区域组件
const LanguageSelector = memo(() => (
    <div className='h-[35px] flex justify-center items-center absolute top-0 left-1/2 -translate-x-1/2 z-50'>
        <div className='w-[180px]'>
            <LanguageArea />
        </div>
    </div>
));

// 源文本区域组件
const SourceArea = memo(({ SourceAreaComponent, sourceAreaProps, pluginList, serviceInstanceConfigMap }) => (
    <div className='w-1/2 pl-[8px]'>
        {serviceInstanceConfigMap !== null && (
            <SourceAreaComponent
                pluginList={pluginList}
                serviceInstanceConfigMap={serviceInstanceConfigMap}
                {...sourceAreaProps}
            />
        )}
    </div>
));

// 翻译结果项组件
const TranslateServiceItem = memo(
    ({
        serviceInstanceKey,
        index,
        dragProvided,
        translateServiceInstanceList,
        pluginList,
        serviceInstanceConfigMap,
        sourceTextAtom,
        detectLanguageAtom,
    }) => (
        <div
            ref={dragProvided.innerRef}
            {...dragProvided.draggableProps}
        >
            <Suspense fallback={<div>Loading...</div>}>
                <TargetArea
                    {...dragProvided.dragHandleProps}
                    index={index}
                    name={serviceInstanceKey}
                    translateServiceInstanceList={translateServiceInstanceList}
                    pluginList={pluginList}
                    serviceInstanceConfigMap={serviceInstanceConfigMap}
                    sourceTextAtom={sourceTextAtom}
                    detectLanguageAtom={detectLanguageAtom}
                />
            </Suspense>
            <Spacer y={2} />
        </div>
    )
);

// 翻译结果列表组件
const TranslateServiceList = memo(
    ({
        translateServiceInstanceList,
        serviceInstanceConfigMap,
        pluginList,
        sourceTextAtom,
        detectLanguageAtom,
        onDragEnd,
    }) => {
        if (!translateServiceInstanceList || !serviceInstanceConfigMap) {
            return null;
        }

        return (
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
                            {translateServiceInstanceList.map((serviceInstanceKey, index) => {
                                const config = serviceInstanceConfigMap[serviceInstanceKey] ?? {};
                                const enable = config['enable'] ?? true;

                                if (!enable) return null;

                                return (
                                    <Draggable
                                        key={serviceInstanceKey}
                                        draggableId={serviceInstanceKey}
                                        index={index}
                                    >
                                        {(dragProvided) => (
                                            <TranslateServiceItem
                                                serviceInstanceKey={serviceInstanceKey}
                                                index={index}
                                                dragProvided={dragProvided}
                                                translateServiceInstanceList={translateServiceInstanceList}
                                                pluginList={pluginList}
                                                serviceInstanceConfigMap={serviceInstanceConfigMap}
                                                sourceTextAtom={sourceTextAtom}
                                                detectLanguageAtom={detectLanguageAtom}
                                            />
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        );
    }
);

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

    if (!pluginList) return null;

    return (
        <div
            className={`bg-background h-screen w-screen ${osType === 'Linux' && 'rounded-[10px] border-1 border-default-100'}`}
        >
            {/* 拖拽区域 */}
            <div
                data-tauri-drag-region='true'
                className='fixed top-[5px] left-[5px] right-[5px] h-[30px]'
            />

            {/* 窗口标题栏 */}
            <TitleBar
                showWindowControl={showWindowControl}
                windowHeader={windowHeader}
            />

            {/* 语言选择区域 */}
            <LanguageSelector />

            {/* 主内容区域 */}
            <div className={`h-[calc(100vh-${hideLanguage ? '35' : '70'}px)]`}>
                <div className='h-full overflow-hidden'>
                    <div className='flex flex-row gap-2 h-full'>
                        {/* 源文本区域 */}
                        <SourceArea
                            SourceAreaComponent={SourceAreaComponent}
                            sourceAreaProps={sourceAreaProps}
                            pluginList={pluginList}
                            serviceInstanceConfigMap={serviceInstanceConfigMap}
                        />

                        {/* 翻译结果区域 */}
                        <div className='w-1/2 h-full overflow-y-auto thin-scrollbar'>
                            <TranslateServiceList
                                translateServiceInstanceList={translateServiceInstanceList}
                                serviceInstanceConfigMap={serviceInstanceConfigMap}
                                pluginList={pluginList}
                                sourceTextAtom={sourceTextAtom}
                                detectLanguageAtom={detectLanguageAtom}
                                onDragEnd={onDragEnd}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
