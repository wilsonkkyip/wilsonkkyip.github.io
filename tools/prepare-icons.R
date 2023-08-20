library(magick)

img <- image_read_svg("cangjie/img/icon-bg.svg")

conf <- '{
  "generic": [
    {"size": "32"},
    {"size": "57"},
    {"size": "76"},
    {"size": "96"},
    {"size": "128"},
    {"size": "192"},
    {"size": "228"}
  ],
  "android": [
    {"size": 196}
  ],
  "ios": [
    {"size": "120"},
    {"size": "152"},
    {"size": "180"}
  ]
}'

conf_list <- jsonlite::fromJSON(conf, simplifyVector = F)

for (k in names(conf_list)) {
  for (i in c(1:length(conf_list[[k]]))) {
    tmp <- image_scale(img, conf_list[[k]][[i]]$size)
    image_write(tmp, sprintf("cangjie/img/icon-%s.png", conf_list[[k]][[i]]$size))
  }
}

for (k in names(conf_list)) {
  if (k == "generic") {
    rel <- "icon"
  } else if (k == "android") {
    rel <- "shortcut icon"
  } else if (k == "ios") {
    rel <- "apple-touch-icon"
  } else {
    stop("invalue `key`")
  }
  for (i in c(1:length(conf_list[[k]]))) {
    tmp <- sprintf('<link rel="%1$s" href="https://wilsonkkyip.github.io/cangjie/img/icon-%2$s.png" sizes="%2$sx%2$s">\n', rel, conf_list[[k]][[i]]$size)
    cat(tmp)
  }
}



