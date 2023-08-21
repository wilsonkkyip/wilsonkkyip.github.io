library(magick)

# corner radius for the 512x512 icon = 80 (iTunesArtwork)
# corner radius for the 1024x1024 icon = 180 (iTunesArtwork Retina)
# corner radius for the 57x57 icon = 9 (iPhone/iPod Touch)
# corner radius for the 114x114 icon = 18 (iPhone/iPod Touch Retina)
# corner radius for the 72x72 icon = 11 (iPad)
# corner radius for the 144x144 icon = 23 (iPad Retina)

fname <- "favicons/favicon.svg"
bname <- tools::file_path_sans_ext(basename(fname))
dname <- dirname(fname)
img <- image_read_svg(fname)

conf <- '{
  "generic": [
    {"size": "32"},
    {"size": "57"},
    {"size": "76"},
    {"size": "96"},
    {"size": "128"},
    {"size": "192"},
    {"size": "228"},
    {"size": "512"}
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
    image_write(tmp, sprintf("%s/%s-%s.png", dname, bname, conf_list[[k]][[i]]$size))
  }
}

tag_str <- '<link rel="%1$s" href="https://wilsonkkyip.github.io/%2$s/%3$s-%4$s.png" sizes="%4$sx%4$s">\n'
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
    tmp <- sprintf(tag_str, rel, dname, bname, conf_list[[k]][[i]]$size)
    cat(tmp)
  }
}



