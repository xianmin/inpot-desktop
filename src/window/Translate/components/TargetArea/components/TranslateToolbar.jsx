import React from 'react';
import { ButtonGroup, Button, Tooltip } from '@nextui-org/react';
import { HiOutlineVolumeUp } from 'react-icons/hi';
import { MdContentCopy } from 'react-icons/md';
import { TbTransformFilled } from 'react-icons/tb';
import { GiCycle } from 'react-icons/gi';
import { useTranslation } from 'react-i18next';
import { getServiceName, getServiceSouceType, ServiceSourceType } from '../../../../../utils/service_instance';
import toast from 'react-hot-toast';
import { writeText } from '@tauri-apps/api/clipboard';

const TranslateToolbar = ({
    result,
    error,
    handleSpeak,
    toastStyle,
    handleTranslateBack,
    handleRetry,
    collectionServiceList,
    serviceInstanceConfigMap,
    pluginList,
    builtinCollectionServices,
    sourceText,
    handleCollection,
}) => {
    const { t } = useTranslation();
    const isStringResult = typeof result === 'string';
    const hasResult = isStringResult && result !== '';

    return (
        <ButtonGroup>
            {/* speak button */}
            <Tooltip content={t('translate.speak')}>
                <Button
                    isIconOnly
                    variant='light'
                    size='sm'
                    isDisabled={!hasResult}
                    onPress={() => {
                        handleSpeak().catch((e) => {
                            toast.error(e.toString(), { style: toastStyle });
                        });
                    }}
                >
                    <HiOutlineVolumeUp className='text-[16px]' />
                </Button>
            </Tooltip>

            {/* copy button */}
            <Tooltip content={t('translate.copy')}>
                <Button
                    isIconOnly
                    variant='light'
                    size='sm'
                    isDisabled={!hasResult}
                    onPress={() => writeText(result)}
                >
                    <MdContentCopy className='text-[16px]' />
                </Button>
            </Tooltip>

            {/* translate back button */}
            <Tooltip content={t('translate.translate_back')}>
                <Button
                    isIconOnly
                    variant='light'
                    size='sm'
                    isDisabled={!hasResult}
                    onPress={handleTranslateBack}
                >
                    <TbTransformFilled className='text-[16px]' />
                </Button>
            </Tooltip>

            {/* error retry button */}
            <Tooltip content={t('translate.retry')}>
                <Button
                    isIconOnly
                    variant='light'
                    size='sm'
                    className={`${error === '' && 'hidden'}`}
                    onPress={handleRetry}
                >
                    <GiCycle className='text-[16px]' />
                </Button>
            </Tooltip>

            {/* available collection service instance */}
            {collectionServiceList &&
                collectionServiceList.map((collectionServiceInstanceName) => (
                    <Button
                        key={collectionServiceInstanceName}
                        isIconOnly
                        variant='light'
                        size='sm'
                        onPress={() => handleCollection(collectionServiceInstanceName)}
                    >
                        <img
                            src={
                                getServiceSouceType(collectionServiceInstanceName) === ServiceSourceType.PLUGIN
                                    ? pluginList['collection'][getServiceName(collectionServiceInstanceName)].icon
                                    : builtinCollectionServices[getServiceName(collectionServiceInstanceName)].info.icon
                            }
                            className='h-[16px] w-[16px]'
                            alt='Collection icon'
                        />
                    </Button>
                ))}
        </ButtonGroup>
    );
};

export default TranslateToolbar;
