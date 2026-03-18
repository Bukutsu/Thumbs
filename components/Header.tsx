//implement our own header with react-native-paper
import React from "react";
import { Appbar } from "react-native-paper";
import { getHeaderTitle } from "@react-navigation/elements";

export const Header = ({ navigation, route, options, back }: any) => {
  const title = getHeaderTitle(options, route.name);

  return (
    <Appbar.Header mode="center-aligned">
      {/* If there's a back route, show the back button */}
      {back ? <Appbar.BackAction onPress={navigation.goBack} /> : null}
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
};
