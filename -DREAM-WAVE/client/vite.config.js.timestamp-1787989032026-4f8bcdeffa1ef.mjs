// vite.config.js
import { defineConfig } from "file:///D:/-DREAM-WAVE/client/node_modules/vite/dist/node/index.js";
import react from "file:///D:/-DREAM-WAVE/client/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///D:/-DREAM-WAVE/client/vite.config.js";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@student": path.resolve(__dirname, "src/modules/student"),
      "@institution": path.resolve(__dirname, "src/modules/institution"),
      "@company": path.resolve(__dirname, "src/modules/company")
    }
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-axios": ["axios"]
        }
      }
    },
    chunkSizeWarningLimit: 700
  },
  server: {
    port: 5173,
    // Listen on IPv4 + IPv6 so both localhost and 127.0.0.1 work
    host: true,
    strictPort: true,
    proxy: {
      "/api": {
        // Always IPv4 — avoids macOS localhost → ::1 ECONNREFUSED
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const cookies = proxyRes.headers["set-cookie"];
            if (cookies) {
              proxyRes.headers["set-cookie"] = cookies.map(
                (c) => c.replace(/;\s*Secure/gi, "").replace(/;\s*Domain=[^;]+/gi, "")
              );
            }
          });
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "axios"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFwtRFJFQU0tV0FWRVxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXC1EUkVBTS1XQVZFXFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovLURSRUFNLVdBVkUvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJ1xuXG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0BzaGFyZWQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3NoYXJlZCcpLFxuICAgICAgJ0BzdHVkZW50JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9tb2R1bGVzL3N0dWRlbnQnKSxcbiAgICAgICdAaW5zdGl0dXRpb24nOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL21vZHVsZXMvaW5zdGl0dXRpb24nKSxcbiAgICAgICdAY29tcGFueSc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvbW9kdWxlcy9jb21wYW55JyksXG4gICAgfSxcbiAgfSxcblxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAndmVuZG9yLXJlYWN0JzogIFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAndmVuZG9yLW1vdGlvbic6IFsnZnJhbWVyLW1vdGlvbiddLFxuICAgICAgICAgICd2ZW5kb3ItYXhpb3MnOiAgWydheGlvcyddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNzAwLFxuICB9LFxuXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgLy8gTGlzdGVuIG9uIElQdjQgKyBJUHY2IHNvIGJvdGggbG9jYWxob3N0IGFuZCAxMjcuMC4wLjEgd29ya1xuICAgIGhvc3Q6IHRydWUsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIC8vIEFsd2F5cyBJUHY0IFx1MjAxNCBhdm9pZHMgbWFjT1MgbG9jYWxob3N0IFx1MjE5MiA6OjEgRUNPTk5SRUZVU0VEXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6NTAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgcmV3cml0ZTogKHApID0+IHAsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb29raWVzID0gcHJveHlSZXMuaGVhZGVyc1snc2V0LWNvb2tpZSddXG4gICAgICAgICAgICBpZiAoY29va2llcykge1xuICAgICAgICAgICAgICBwcm94eVJlcy5oZWFkZXJzWydzZXQtY29va2llJ10gPSBjb29raWVzLm1hcCgoYykgPT5cbiAgICAgICAgICAgICAgICBjLnJlcGxhY2UoLztcXHMqU2VjdXJlL2dpLCAnJykucmVwbGFjZSgvO1xccypEb21haW49W147XSsvZ2ksICcnKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcblxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nLCAnZnJhbWVyLW1vdGlvbicsICdheGlvcycsXG4gICAgXSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVQLFNBQVMsb0JBQW9CO0FBQ3BSLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFIeUgsSUFBTSwyQ0FBMkM7QUFLeE0sSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFFN0QsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLFdBQVcsS0FBSyxRQUFRLFdBQVcsWUFBWTtBQUFBLE1BQy9DLFlBQVksS0FBSyxRQUFRLFdBQVcscUJBQXFCO0FBQUEsTUFDekQsZ0JBQWdCLEtBQUssUUFBUSxXQUFXLHlCQUF5QjtBQUFBLE1BQ2pFLFlBQVksS0FBSyxRQUFRLFdBQVcscUJBQXFCO0FBQUEsSUFDM0Q7QUFBQSxFQUNGO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBaUIsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDMUQsaUJBQWlCLENBQUMsZUFBZTtBQUFBLFVBQ2pDLGdCQUFpQixDQUFDLE9BQU87QUFBQSxRQUMzQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFFTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUE7QUFBQSxRQUVOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQyxNQUFNO0FBQUEsUUFDaEIsV0FBVyxDQUFDLFVBQVU7QUFDcEIsZ0JBQU0sR0FBRyxZQUFZLENBQUMsYUFBYTtBQUNqQyxrQkFBTSxVQUFVLFNBQVMsUUFBUSxZQUFZO0FBQzdDLGdCQUFJLFNBQVM7QUFDWCx1QkFBUyxRQUFRLFlBQVksSUFBSSxRQUFRO0FBQUEsZ0JBQUksQ0FBQyxNQUM1QyxFQUFFLFFBQVEsZ0JBQWdCLEVBQUUsRUFBRSxRQUFRLHNCQUFzQixFQUFFO0FBQUEsY0FDaEU7QUFBQSxZQUNGO0FBQUEsVUFDRixDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUFTO0FBQUEsTUFBYTtBQUFBLE1BQW9CO0FBQUEsTUFBaUI7QUFBQSxJQUM3RDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
