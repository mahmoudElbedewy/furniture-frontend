self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Home Style";
  const options = {
    body: data.body || data.message || "لديك رسالة جديدة.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { url: data.url || "/#catalog" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
