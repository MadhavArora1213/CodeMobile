import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface EditorProps {
  content: string;
  language: string;
  onChange: (code: string) => void;
  onAiSuggestionRequest: (context: string, language: string) => void;
}

export interface EditorRef {
  sendCommand: (command: string) => void;
  sendData: (data: any) => void;
}

const Editor = forwardRef<EditorRef, EditorProps>(({ content, language, onChange, onAiSuggestionRequest }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);

  useImperativeHandle(ref, () => ({
    sendCommand: (command: string) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type: 'COMMAND', command }));
      }
    },
    sendData: (data: any) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(data));
      }
    }
  }));

  useEffect(() => {
    if (isReady.current && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'LOAD_FILE',
        content: content,
        language: language
      }));
    }
  }, [content, language]);

  const editorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
        <script src="https://unpkg.com/prettier@2.8.8/standalone.js"></script>
        <script src="https://unpkg.com/prettier@2.8.8/parser-babel.js"></script>
        <script src="https://unpkg.com/prettier@2.8.8/parser-html.js"></script>
        <script src="https://unpkg.com/prettier@2.8.8/parser-postcss.js"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { height: 100%; width: 100%; background: #1e1e1e; overflow: hidden; }
            #container { width: 100vw; height: 100vh; }
            
            .ai-ghost-text {
                color: #6a9955 !important;
                opacity: 0.6;
                font-style: italic;
            }
            
            /* Hide Monaco default context menu on mobile long press */
            .monaco-editor .context-view { display: none !important; }
            
            /* Mobile Keyboard Helpers */
            /* Mobile Keyboard Helpers */
            /* Mobile Keyboard Helpers */
            textarea.monaco-mouse-cursor-text, 
            textarea.tao_textarea, 
            #container textarea {
                user-select: text !important;
                -webkit-user-select: text !important;
                display: block !important;
                opacity: 0.001 !important;
                width: 1px !important;
                height: 1px !important;
                position: absolute !important;
                z-index: 1000 !important;
                pointer-events: none !important;
                background: transparent !important;
                border: none !important;
                outline: none !important;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>

        <script>
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
            
            let editor;
            let currentLanguage = 'javascript';

            require(['vs/editor/editor.main'], function() {
                // Tailwind CSS common classes for suggestion
                const TAILWIND_CLASSES = [
                    'flex', 'flex-col', 'flex-row', 'items-center', 'justify-center', 'justify-between',
                    'p-1', 'p-2', 'p-4', 'm-1', 'm-2', 'm-4', 'bg-white', 'bg-black', 'bg-blue-500', 
                    'text-white', 'text-black', 'text-sm', 'text-lg', 'font-bold', 'rounded', 'shadow',
                    'w-full', 'h-full', 'grid', 'grid-cols-1', 'grid-cols-2', 'gap-2', 'gap-4',
                    'hidden', 'block', 'invisible', 'opacity-0', 'transition', 'duration-300'
                ];

                const tailwindProvider = {
                    provideCompletionItems: (model, position) => {
                        const word = model.getWordUntilPosition(position);
                        const range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn
                        };
                        return {
                            suggestions: TAILWIND_CLASSES.map(cls => ({
                                label: cls,
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: cls,
                                detail: 'Tailwind CSS Class',
                                range: range
                            }))
                        };
                    }
                };
                
                monaco.languages.registerCompletionItemProvider('html', tailwindProvider);
                monaco.languages.registerCompletionItemProvider('javascript', tailwindProvider);
                monaco.languages.registerCompletionItemProvider('typescript', tailwindProvider);

                // AI Inline Suggestion (Ghost Text) Logic
                let suggestionDecoration = [];
                let currentSuggestion = '';
                let suggestionTimeout;

                function clearSuggestion() {
                    if (suggestionDecoration.length > 0) {
                        editor.deltaDecorations(suggestionDecoration, []);
                        suggestionDecoration = [];
                    }
                    currentSuggestion = '';
                }

                function showSuggestion(text, pos) {
                    clearSuggestion();
                    if (!text) return;
                    currentSuggestion = text;
                    suggestionDecoration = editor.deltaDecorations([], [
                        {
                            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                            options: {
                                after: {
                                    content: text,
                                    inlineClassName: 'ai-ghost-text'
                                }
                            }
                        }
                    ]);
                }

                editor = monaco.editor.create(document.getElementById('container'), {
                    value: '',
                    language: currentLanguage,
                    theme: 'vs-dark',
                    automaticLayout: true,
                    fontSize: 14,
                    tabSize: 4,
                    autoFocus: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'off',
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: true
                    },
                    // Mobile optimizations
                    links: false,
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    overviewRulerBorder: false,
                    renderLineHighlight: 'all',
                    occurrencesHighlight: true,
                    selectionHighlight: true,
                    readOnly: false,
                    domReadOnly: false,
                    accessibilitySupport: 'on',
                    fixedOverflowWidgets: true,
                    folding: false,
                    scrollbar: {
                        vertical: 'visible',
                        horizontal: 'visible',
                        verticalScrollbarSize: 12,
                        horizontalScrollbarSize: 12,
                        useShadows: false
                    }
                });

                // Advanced focus + movement logic for mobile Monaco
                function forceFocus(e) {
                    if (!editor) return;
                    
                    const textarea = document.querySelector('textarea.monaco-mouse-cursor-text') || 
                                     document.querySelector('textarea.tao_textarea') ||
                                     document.querySelector('#container textarea');
                                     
                    if (textarea) {
                        // 1. Manually resolve the cursor position from the touch event
                        const target = editor.getTargetAtEvent(e);
                        if (target && target.position) {
                            editor.setPosition(target.position);
                            editor.revealPositionInCenterIfOutsideViewport(target.position);
                        }
                        
                        // 2. Position hidden input to satisfy browser security
                        if (e && (e.clientX || (e.touches && e.touches[0]))) {
                            const x = e.clientX || e.touches[0].clientX;
                            const y = e.clientY || e.touches[0].clientY;
                            textarea.style.left = (x) + 'px'; 
                            textarea.style.top = (y) + 'px';
                        }
                        
                        // 3. Trigger the keyboard
                        textarea.focus();
                        
                        // 4. Ensure Monaco keeps focus
                        setTimeout(() => {
                            if (!editor.hasWidgetFocus()) {
                                editor.focus();
                            }
                        }, 50);
                    }
                }

                const container = document.getElementById('container');
                ['touchstart', 'click'].forEach(evt => {
                    container.addEventListener(evt, forceFocus); 
                });

                // Formatter function
                async function formatCode() {
                    const code = editor.getValue();
                    const lang = monaco.editor.getModel(editor.getModel().uri).getLanguageId();
                    let parser = '';
                    if (lang === 'javascript' || lang === 'typescript') parser = 'babel';
                    else if (lang === 'html') parser = 'html';
                    else if (lang === 'css') parser = 'css';
                    else return; // Not supported for others yet

                    try {
                        const formatted = prettier.format(code, {
                            parser: parser,
                            plugins: prettierPlugins,
                            tabWidth: 4,
                            semi: true,
                            singleQuote: true
                        });
                        editor.setValue(formatted);
                    } catch (err) {
                        console.error('Format error:', err);
                    }
                }

                editor.onDidChangeModelContent((e) => {
                    const value = editor.getValue();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CODE_CHANGED',
                        code: value
                    }));

                    // Clear any pending state
                    clearTimeout(suggestionTimeout);
                    clearSuggestion();
                });

                // Interaction for suggestions
                editor.addCommand(monaco.KeyCode.Tab, () => {
                    if (currentSuggestion) {
                        const pos = editor.getPosition();
                        editor.executeEdits('ai-suggest', [{
                            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                            text: currentSuggestion
                        }]);
                        clearSuggestion();
                    } else {
                        editor.trigger('keyboard', 'type', { text: '    ' });
                    }
                }, 'editorTextFocus');

                editor.addCommand(monaco.KeyCode.Escape, () => {
                    clearSuggestion();
                }, 'editorTextFocus');

                // Message Handler
                function handleMessage(event) {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'LOAD_FILE') {
                            if (editor) {
                                editor.setValue(data.content || '');
                                if (data.language) {
                                    monaco.editor.setModelLanguage(editor.getModel(), data.language);
                                }
                                // Retry focus multiple times on load
                                let count = 0;
                                const interval = setInterval(() => {
                                    forceFocus();
                                    if (++count > 5) clearInterval(interval);
                                }, 200);
                            }
                        } else if (data.type === 'AI_SUGGESTION_RESULT') {
                            showSuggestion(data.suggestion, editor.getPosition());
                        } else if (data.type === 'COMMAND') {
                            switch(data.command) {
                                case 'focus': forceFocus(); break;
                                case 'undo': editor.trigger('keyboard', 'undo', null); break;
                                case 'redo': editor.trigger('keyboard', 'redo', null); break;
                                case 'cut': document.execCommand('cut'); break;
                                case 'copy': document.execCommand('copy'); break;
                                case 'selectAll': editor.setSelection(editor.getModel().getFullModelRange()); break;
                                case 'wordWrapOn': editor.updateOptions({ wordWrap: 'on' }); break;
                                case 'wordWrapOff': editor.updateOptions({ wordWrap: 'off' }); break;
                                case 'find': editor.getAction('actions.find').run(); break;
                                case 'replace': editor.getAction('editor.action.startFindReplaceAction').run(); break;
                                case 'format': formatCode(); break;
                            }
                        } else if (data.type === 'PASTE') {
                            editor.trigger('keyboard', 'type', { text: data.text });
                        }
                    } catch(e) {}
                }

                window.addEventListener('message', handleMessage);
                document.addEventListener('message', handleMessage);

                // Ready Signal
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
                setTimeout(forceFocus, 500);
            });
        </script>
    </body>
    </html>
  `;

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CODE_CHANGED') {
        onChange(data.code);
      } else if (data.type === 'READY') {
        isReady.current = true;
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'LOAD_FILE',
          content: content,
          language: language
        }));
      } else if (data.type === 'CLIPBOARD_COPY') {
        // Use React Native clipboard
        try {
          const { Clipboard } = require('react-native');
          Clipboard?.setString?.(data.text);
        } catch(e) {}
      } else if (data.type === 'SHOW_PANEL') {
        // This will be handled by EditorScreen via onShowPanel prop if needed
      } else if (data.type === 'REQUEST_AI_SUGGESTION') {
        // Handle in EditorScreen to call Ollama
        onAiSuggestionRequest(data.context, data.language);
      }
    } catch (e) {
      console.error('WebView Message Error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: editorHtml }}
        onMessage={onMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={true}
        scrollEnabled={false}
        bounces={false}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default Editor;
