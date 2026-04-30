// Service worker for TallerTotal push notifications (mechanic)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "TallerTotal", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "TallerTotal", {
      body: data.body ?? "",
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});
