// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'

const TabsLayout = () => {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
            <Tabs.Screen
                name="index"
                options={{
                    headerTitle: "Home Tab",
                    title: "Home Tab Title",
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="tab_1"
                options={{
                    headerTitle: "Tab 1",
                    title: "Tab 1 Title"
                }}
            />
            <Tabs.Screen
                name="tab_2/index"
                options={{
                    headerTitle: "Tab 2",
                    title: "Tab 2 Title"
                }} />
        </Tabs>
    )
}

export default TabsLayout