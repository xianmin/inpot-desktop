import { listen, emit } from '@tauri-apps/api/event';
import { appWindow, currentMonitor } from '@tauri-apps/api/window';
import { store } from '../../../utils/store';
import { info } from 'tauri-plugin-log-api';
import { useRef, useEffect, useCallback } from 'react';

export function useWindowManager({ closeOnBlur, alwaysOnTop, windowPosition, rememberWindowSize }) {
  const blurTimeoutRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const moveTimeoutRef = useRef(null);
  const unlistenRef = useRef(null);

  // 监听窗口失焦事件
  const listenBlur = useCallback(() => {
    const unlistenPromise = listen('tauri://blur', () => {
      if (appWindow.label === 'translate') {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
        }
        info('Blur');
        // 100ms后隐藏窗口，而不是关闭它
        // 因为在 windows 下拖动窗口时会先切换成 blur 再立即切换成 focus
        blurTimeoutRef.current = setTimeout(async () => {
          info('Hiding window instead of closing');
          // 仅隐藏窗口，不关闭
          await appWindow.hide();
          // 触发window-hidden事件，让SourceArea组件知道窗口被隐藏了
          await emit('tauri://window-hidden', {});
        }, 100);
      }
    });

    unlistenRef.current = unlistenPromise;
    return unlistenPromise;
  }, []);

  // 取消 blur 监听
  const unlistenBlur = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current.then(f => f());
      unlistenRef.current = null;
    }
  }, []);

  // 设置初始监听
  useEffect(() => {
    if (closeOnBlur) {
      listenBlur();
    }

    // 初始化监听 focus 事件取消 blurTimeout 时间之内的关闭窗口
    const focusUnlisten = listen('tauri://focus', () => {
      info('Focus');
      if (blurTimeoutRef.current) {
        info('Cancel Close');
        clearTimeout(blurTimeoutRef.current);
      }
    });

    // 初始化监听 move 事件取消 blurTimeout 时间之内的关闭窗口
    const moveUnlisten = listen('tauri://move', () => {
      info('Move');
      if (blurTimeoutRef.current) {
        info('Cancel Close');
        clearTimeout(blurTimeoutRef.current);
      }
    });

    return () => {
      unlistenBlur();
      focusUnlisten.then(f => f());
      moveUnlisten.then(f => f());
    };
  }, [closeOnBlur, listenBlur, unlistenBlur]);

  // 保存窗口位置
  useEffect(() => {
    if (windowPosition !== null && windowPosition === 'pre_state') {
      const unlistenMove = listen('tauri://move', async () => {
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }
        moveTimeoutRef.current = setTimeout(async () => {
          if (appWindow.label === 'translate') {
            let position = await appWindow.outerPosition();
            const monitor = await currentMonitor();
            const factor = monitor.scaleFactor;
            position = position.toLogical(factor);
            await store.set('translate_window_position_x', parseInt(position.x));
            await store.set('translate_window_position_y', parseInt(position.y));
            await store.save();
          }
        }, 100);
      });
      return () => {
        unlistenMove.then((f) => {
          f();
        });
      };
    }
  }, [windowPosition]);

  // 保存窗口大小
  useEffect(() => {
    if (rememberWindowSize !== null && rememberWindowSize) {
      const unlistenResize = listen('tauri://resize', async () => {
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(async () => {
          if (appWindow.label === 'translate') {
            let size = await appWindow.outerSize();
            const monitor = await currentMonitor();
            const factor = monitor.scaleFactor;
            size = size.toLogical(factor);
            await store.set('translate_window_height', parseInt(size.height));
            await store.set('translate_window_width', parseInt(size.width));
            await store.save();
          }
        }, 100);
      });
      return () => {
        unlistenResize.then((f) => {
          f();
        });
      };
    }
  }, [rememberWindowSize]);

  return { listenBlur, unlistenBlur };
}
