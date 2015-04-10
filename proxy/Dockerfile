FROM centos:centos6

RUN rpm -Uvh http://download.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
RUN yum install -y npm
COPY . /src
RUN cd /src/proxy; npm install

EXPOSE 8080

CMD ["node", "/src/proxy/app.js"]
