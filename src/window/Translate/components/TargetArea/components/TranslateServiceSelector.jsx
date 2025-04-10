import React from 'react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import {
    getServiceName,
    getDisplayInstanceName,
    whetherPluginService,
    INSTANCE_NAME_CONFIG_KEY,
} from '../../../../../utils/service_instance';

const TranslateServiceSelector = ({
    currentTranslateServiceInstanceKey,
    translateServiceInstanceList,
    pluginList,
    builtinServices,
    serviceInstanceConfigMap,
    onServiceChange,
}) => {
    const { t } = useTranslation();

    function getInstanceName(instanceKey, serviceNameSupplier) {
        const instanceConfig = serviceInstanceConfigMap[instanceKey] ?? {};
        return getDisplayInstanceName(instanceConfig[INSTANCE_NAME_CONFIG_KEY], serviceNameSupplier);
    }

    return (
        <Dropdown>
            <DropdownTrigger>
                <Button
                    size='sm'
                    variant='solid'
                    className='bg-transparent'
                    startContent={
                        whetherPluginService(currentTranslateServiceInstanceKey) ? (
                            <img
                                src={pluginList['translate'][getServiceName(currentTranslateServiceInstanceKey)].icon}
                                className='h-[20px] my-auto'
                                alt='Service icon'
                            />
                        ) : (
                            <img
                                src={builtinServices[getServiceName(currentTranslateServiceInstanceKey)].info.icon}
                                className='h-[20px] my-auto'
                                alt='Service icon'
                            />
                        )
                    }
                >
                    {whetherPluginService(currentTranslateServiceInstanceKey) ? (
                        <div className='my-auto'>{`${getInstanceName(currentTranslateServiceInstanceKey, () => pluginList['translate'][getServiceName(currentTranslateServiceInstanceKey)].display)} `}</div>
                    ) : (
                        <div className='my-auto'>
                            {getInstanceName(currentTranslateServiceInstanceKey, () =>
                                t(`services.translate.${getServiceName(currentTranslateServiceInstanceKey)}.title`)
                            )}
                        </div>
                    )}
                </Button>
            </DropdownTrigger>
            <DropdownMenu
                aria-label='app language'
                className='max-h-[40vh] overflow-y-auto'
                onAction={onServiceChange}
            >
                {translateServiceInstanceList.map((instanceKey) => (
                    <DropdownItem
                        key={instanceKey}
                        startContent={
                            whetherPluginService(instanceKey) ? (
                                <img
                                    src={pluginList['translate'][getServiceName(instanceKey)].icon}
                                    className='h-[20px] my-auto'
                                    alt='Service icon'
                                />
                            ) : (
                                <img
                                    src={builtinServices[getServiceName(instanceKey)].info.icon}
                                    className='h-[20px] my-auto'
                                    alt='Service icon'
                                />
                            )
                        }
                    >
                        {whetherPluginService(instanceKey) ? (
                            <div className='my-auto'>{`${getInstanceName(instanceKey, () => pluginList['translate'][getServiceName(instanceKey)].display)} `}</div>
                        ) : (
                            <div className='my-auto'>
                                {getInstanceName(instanceKey, () =>
                                    t(`services.translate.${getServiceName(instanceKey)}.title`)
                                )}
                            </div>
                        )}
                    </DropdownItem>
                ))}
            </DropdownMenu>
        </Dropdown>
    );
};

export default TranslateServiceSelector;
