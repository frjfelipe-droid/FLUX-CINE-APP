package com.fluxcine.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FluxEditorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
