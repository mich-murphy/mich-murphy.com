{{- /* A new post, from hugo new content posts/<name>.md: its title from the file name, and today's date. The build
  fails until summary is filled in (head.html) */ -}}
+++
title = "{{ replace .File.ContentBaseName "-" " " | title }}"
date = {{ now.Format "2006-01-02" }}
summary = ""
tags = []
+++
