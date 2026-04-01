import React from "react";
import { View, ScrollView } from "react-native";
import { List, Divider, Text, RadioButton } from "react-native-paper";
import { useTheme, ThemeMode } from "../../../contexts/ThemeContext";

const SettingsScreen = () => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <ScrollView>
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Theme"
          description="Choose your preferred theme"
          left={(props) => <List.Icon {...props} icon="brightness-6" />}
        />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <RadioButton.Group
            onValueChange={(value) => setThemeMode(value as ThemeMode)}
            value={themeMode}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <RadioButton.Item label="Light" value="light" position="leading" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <RadioButton.Item label="Dark" value="dark" position="leading" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <RadioButton.Item label="System Default" value="system" position="leading" />
            </View>
          </RadioButton.Group>
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="Thumbs"
          description="A typing speed test app"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
        <List.Item
          title="Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="tag" />}
        />
        <List.Item
          title="Built with"
          description="React Native & Expo"
          left={(props) => <List.Icon {...props} icon="react" />}
        />
      </List.Section>
    </ScrollView>
  );
};

export default SettingsScreen;