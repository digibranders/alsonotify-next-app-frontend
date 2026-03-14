'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App } from "antd";
import { ReactNode } from "react";

export function AntDesignProvider({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            // Preserve Tailwind CSS color tokens
            colorPrimary: "var(--primary)",
            borderRadius: 8,
            fontFamily: "var(--font-manrope), sans-serif",
          },
          components: {
            Tabs: {
              titleFontSize: 14,
            },
          },
        }}
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}

