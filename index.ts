import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

registerRootComponent(App);

// Register the Native Android Home Screen Widget Task Handler
registerWidgetTaskHandler(widgetTaskHandler);
