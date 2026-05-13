/**
 * Parent Navigator
 *
 * Parent portal stack: Home, Child, Grades, Attendance, Report Card
 */

import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentStackParamList } from './types';
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint';
import { getTabletSceneStyle } from '@/utils/layout';

import {
  ParentHomeScreen,
  ParentChildScreen,
  ParentChildGradesScreen,
  ParentChildAttendanceScreen,
  ParentChildReportCardScreen,
} from '@/screens/parent';

const Stack = createNativeStackNavigator<ParentStackParamList>();

const ParentNavigator: React.FC = () => {
  const layout = useLayoutBreakpoint();
  const tabletScene = getTabletSceneStyle(layout);
  const contentStyle = useMemo(() => ({ ...(tabletScene || {}) }), [tabletScene]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle,
      }}
      initialRouteName="ParentHome"
    >
      <Stack.Screen name="ParentHome" component={ParentHomeScreen} />
      <Stack.Screen name="ParentChild" component={ParentChildScreen} />
      <Stack.Screen name="ParentChildGrades" component={ParentChildGradesScreen} />
      <Stack.Screen name="ParentChildAttendance" component={ParentChildAttendanceScreen} />
      <Stack.Screen name="ParentChildReportCard" component={ParentChildReportCardScreen} />
    </Stack.Navigator>
  );
};

export default ParentNavigator;
