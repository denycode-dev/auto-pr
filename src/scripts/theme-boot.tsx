/**
 * Boot script that reads user preference values from cookies or localStorage
 * based on the configured persistence mode.
 *
 * Runs early in <head> to apply the correct data attributes before hydration,
 * preventing layout or theme flicker and keeping RootLayout fully static.
 */
import { PREFERENCE_REGISTRY } from "@/lib/preferences/preferences-config";

export function ThemeBootScript() {
  const registry = JSON.stringify(PREFERENCE_REGISTRY);

  const code = `
    (function () {
      try {
        var root = document.documentElement;
        var REGISTRY = ${registry};

        function readCookie(name) {
          var match = document.cookie.split("; ").find(function(c) {
            return c.startsWith(name + "=");
          });
          return match ? decodeURIComponent(match.split("=")[1]) : null;
        }

        function readLocal(name) {
          try {
            return window.localStorage.getItem(name);
          } catch (e) {
            return null;
          }
        }

        function readPreference(key, definition) {
          var mode = definition.persistence;
          var value = null;

          if (mode === "localStorage") {
            value = readLocal(key);
          }

          if (!value && (mode === "client-cookie" || mode === "server-cookie")) {
            value = readCookie(key);
          }

          return definition.values.indexOf(value) >= 0 ? value : definition.defaultValue;
        }

        var preferences = {};

        Object.keys(REGISTRY).forEach(function(key) {
          var definition = REGISTRY[key];
          var value = readPreference(key, definition);

          preferences[key] = value;
          root.setAttribute(definition.attribute, value);
        });

        var mode = preferences.theme_mode;
        var resolvedMode =
          mode === "system" && window.matchMedia
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : mode === "dark"
              ? "dark"
              : "light";

        root.classList.toggle("dark", resolvedMode === "dark");
        root.style.colorScheme = resolvedMode;

        // Strip extension-injected attributes (e.g. McAfee WebAdvisor's fdprocessedid)
        // before React hydration to prevent attribute mismatch errors.
        if (typeof MutationObserver !== "undefined") {
          var cleanup = function(el) {
            if (el && el.nodeType === 1) {
              if (el.hasAttribute("fdprocessedid")) el.removeAttribute("fdprocessedid");
              if (el.hasAttribute("bis_skin_checked")) el.removeAttribute("bis_skin_checked");
              if (el.querySelectorAll) {
                var nodes = el.querySelectorAll("[fdprocessedid], [bis_skin_checked]");
                for (var k = 0; k < nodes.length; k++) {
                  nodes[k].removeAttribute("fdprocessedid");
                  nodes[k].removeAttribute("bis_skin_checked");
                }
              }
            }
          };

          var extObserver = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
              var m = mutations[i];
              if (m.type === "attributes") {
                if (m.attributeName === "fdprocessedid" && m.target && m.target.hasAttribute("fdprocessedid")) {
                  m.target.removeAttribute("fdprocessedid");
                } else if (m.attributeName === "bis_skin_checked" && m.target && m.target.hasAttribute("bis_skin_checked")) {
                  m.target.removeAttribute("bis_skin_checked");
                }
              } else if (m.type === "childList" && m.addedNodes) {
                for (var j = 0; j < m.addedNodes.length; j++) {
                  cleanup(m.addedNodes[j]);
                }
              }
            }
          });

          extObserver.observe(root, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ["fdprocessedid", "bis_skin_checked"]
          });
        }
      } catch (e) {
        console.warn("ThemeBootScript error:", e);
      }
    })();
  `;

  /* biome-ignore lint/security/noDangerouslySetInnerHtml: required for pre-hydration boot script */
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
