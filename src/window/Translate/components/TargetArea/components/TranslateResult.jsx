import React, { forwardRef } from 'react';
import { nanoid } from 'nanoid';
import { HiOutlineVolumeUp } from 'react-icons/hi';

const TranslateResult = forwardRef(({ result, error, appFontSize, speak }, textAreaRef) => {
    if (error !== '') {
        return error.split('\n').map((v) => (
            <p
                key={v}
                className={`text-[${appFontSize}px] text-red-500`}
            >
                {v}
            </p>
        ));
    }

    if (typeof result === 'string') {
        return (
            <textarea
                ref={textAreaRef}
                className={`text-[${appFontSize}px] h-0 resize-none bg-transparent select-text outline-none`}
                readOnly
                value={result}
            />
        );
    }

    if (!result) return null;

    return (
        <div>
            {result['pronunciations'] &&
                result['pronunciations'].map((pronunciation) => (
                    <div key={nanoid()}>
                        {pronunciation['region'] && (
                            <span className={`text-[${appFontSize}px] mr-[12px] text-default-500`}>
                                {pronunciation['region']}
                            </span>
                        )}
                        {pronunciation['symbol'] && (
                            <span className={`text-[${appFontSize}px] mr-[12px] text-default-500`}>
                                {pronunciation['symbol']}
                            </span>
                        )}
                        {pronunciation['voice'] && pronunciation['voice'] !== '' && (
                            <HiOutlineVolumeUp
                                className={`text-[${appFontSize}px] inline-block my-auto cursor-pointer`}
                                onClick={() => speak(pronunciation['voice'])}
                            />
                        )}
                    </div>
                ))}

            {result['explanations'] &&
                result['explanations'].map((explanations) => (
                    <div key={nanoid()}>
                        {explanations['explains'] &&
                            explanations['explains'].map((explain, index) => (
                                <span key={nanoid()}>
                                    {index === 0 ? (
                                        <>
                                            <span className={`text-[${appFontSize - 2}px] text-default-500 mr-[12px]`}>
                                                {explanations['trait']}
                                            </span>
                                            <span className={`font-bold text-[${appFontSize}px] select-text`}>
                                                {explain}
                                            </span>
                                            <br />
                                        </>
                                    ) : (
                                        <span
                                            className={`text-[${appFontSize - 2}px] text-default-500 select-text mr-1`}
                                            key={nanoid()}
                                        >
                                            {explain}
                                        </span>
                                    )}
                                </span>
                            ))}
                    </div>
                ))}

            <br />

            {result['associations'] &&
                result['associations'].map((association) => (
                    <div key={nanoid()}>
                        <span className={`text-[${appFontSize}px] text-default-500`}>{association}</span>
                    </div>
                ))}

            {result['sentence'] &&
                result['sentence'].map((sentence, index) => (
                    <div key={nanoid()}>
                        <span className={`text-[${appFontSize - 2}px] mr-[12px]`}>{index + 1}.</span>
                        <>
                            {sentence['source'] && (
                                <span
                                    className={`text-[${appFontSize}px] select-text`}
                                    dangerouslySetInnerHTML={{
                                        __html: sentence['source'],
                                    }}
                                />
                            )}
                        </>
                        <>
                            {sentence['target'] && (
                                <div
                                    className={`text-[${appFontSize}px] select-text text-default-500`}
                                    dangerouslySetInnerHTML={{
                                        __html: sentence['target'],
                                    }}
                                />
                            )}
                        </>
                    </div>
                ))}
        </div>
    );
});

export default TranslateResult;
