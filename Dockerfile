FROM node:18-alpine

WORKDIR /app

# 复制package.json文件
COPY package*.json ./
COPY backend/package*.json ./backend/

# 安装依赖
RUN npm install
RUN cd backend && npm install

# 复制应用代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]