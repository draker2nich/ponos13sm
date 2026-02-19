FROM python:3.12-slim

WORKDIR /app

# Зависимости устанавливаем отдельным слоем — кэшируется
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код
COPY . .

# По умолчанию ничего не запускаем — команда задаётся в docker-compose
CMD ["python", "--version"]