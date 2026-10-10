export const site = {
  name: "Junhao Xue",
  title: "Junhao Xue · 个人博客",
  description: "记录想法，保持好奇。关于技术、产品与日常的个人博客。",
  url: "https://xuejunhao.com",
  github: "https://github.com/JunhaoXue",
};

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(new Date(date));
}
