import React from "react";
import { View, ScrollView } from "react-native";
import { List, Divider, Text, RadioButton, SegmentedButtons, useTheme as usePaperTheme } from "react-native-paper";
import { useTheme, ThemeMode, FontSize } from "../../../contexts/ThemeContext";

const SettingsScreen = () => {
  const { themeMode, setThemeMode, fontSize, setFontSize } = useTheme();
  const paperTheme = usePaperTheme();

  return (
    <ScrollView style={{ backgroundColor: paperTheme.colors.background }}>
      <List.Section>
        <List.Subheader style={{ color: paperTheme.colors.primary }}>
          Appearance
        </List.Subheader>
        <List.Item
          title="Theme"
          description="Choose your preferred theme"
          titleStyle={{ color: paperTheme.colors.onSurface }}
          descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
          left={(props) => <List.Icon {...props} icon="brightness-6" color={paperTheme.colors.primary} />}
        />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <RadioButton.Group
            onValueChange={(value) => setThemeMode(value as ThemeMode)}
            value={themeMode}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <RadioButton.Item 
                label="Light" 
                value="light" 
                position="leading"
                labelStyle={{ color: paperTheme.colors.onSurface }}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <RadioButton.Item 
                label="Dark" 
                value="dark" 
                position="leading"
                labelStyle={{ color: paperTheme.colors.onSurface }}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <RadioButton.Item 
                label="System Default" 
                value="system" 
                position="leading"
                labelStyle={{ color: paperTheme.colors.onSurface }}
              />
            </View>
          </RadioButton.Group>
        </View>

        <Divider />

        <List.Item
          title="Font Size"
          description="Adjust typing test text size"
          titleStyle={{ color: paperTheme.colors.onSurface }}
          descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
          left={(props) => <List.Icon {...props} icon="format-size" color={paperTheme.colors.primary} />}
        />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <SegmentedButtons
            value={fontSize}
            onValueChange={(val) => setFontSize(val as FontSize)}
            buttons={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
              { value: "large", label: "L" },
              { value: "xlarge", label: "XL" },
            ]}
          />
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={{ color: paperTheme.colors.primary }}>
          About
        </List.Subheader>
        <List.Item
          title="Thumbs"
          description="A typing speed test app"
          titleStyle={{ color: paperTheme.colors.onSurface }}
          descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
          left={(props) => <List.Icon {...props} icon="information" color={paperTheme.colors.primary} />}
        />
        <List.Item
          title="Version"
          description="1.0.0"
          titleStyle={{ color: paperTheme.colors.onSurface }}
          descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
          left={(props) => <List.Icon {...props} icon="tag" color={paperTheme.colors.primary} />}
        />
        <List.Item
          title="Built with"
          description="React Native & Expo"
          titleStyle={{ color: paperTheme.colors.onSurface }}
          descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
          left={(props) => <List.Icon {...props} icon="react" color={paperTheme.colors.primary} />}
        />
      </List.Section>
    </ScrollView>
  );
};

export default SettingsScreen;
