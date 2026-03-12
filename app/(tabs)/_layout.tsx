import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme, BottomNavigation } from "react-native-paper";
import { CommonActions } from "@react-navigation/native";

const TabsLayout = () => {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface, // Material You surface color for the header
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
        },
        headerTintColor: theme.colors.onSurface, // Text color for the header
        tabBarActiveTintColor: theme.colors.primary,
      }}
      // This custom tabBar overrides Expo's default with Paper's Material 3 Bottom Navigation bar
      tabBar={({ navigation, state, descriptors, insets }) => (
        <BottomNavigation.Bar
          navigationState={state}
          safeAreaInsets={insets}
          onTabPress={({ route, preventDefault }) => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (event.defaultPrevented) {
              preventDefault();
            } else {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          }}
          renderIcon={({ route, focused, color }) => {
            const { options } = descriptors[route.key];
            if (options.tabBarIcon) {
              return options.tabBarIcon({ focused, color, size: 24 });
            }
            return null;
          }}
          getLabelText={({ route }) => {
            const { options } = descriptors[route.key];
            return options.title !== undefined ? options.title : route.name;
          }}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: "Typing Test",
          title: "Test",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={24} name="keyboard-o" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tab_1"
        options={{
          headerTitle: "Leaderboard",
          title: "Leaderboard",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={24} name="trophy" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tab_2/index"
        options={{
          headerTitle: "Profile",
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={24} name="user" color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
