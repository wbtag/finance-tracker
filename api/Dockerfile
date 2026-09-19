FROM python:3.14

RUN mkdir /api
WORKDIR /api

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade pip
COPY requirements.txt  /api/

RUN pip install --no-cache-dir -r requirements.txt

COPY . /api/
WORKDIR /api/finance
EXPOSE 8000

ENTRYPOINT ["/api/entrypoint.sh"]
CMD ["gunicorn", "finance.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
