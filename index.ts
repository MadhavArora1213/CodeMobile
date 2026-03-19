import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import { Buffer } from 'buffer';
import process from 'process';
import * as WebBrowser from 'expo-web-browser';

global.Buffer = Buffer;
global.process = process;

WebBrowser.maybeCompleteAuthSession();

import App from './App';

registerRootComponent(App);
