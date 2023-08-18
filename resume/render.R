#! /usr/local/bin/R

args <- commandArgs(trailingOnly=TRUE)

resume_fname <- sprintf("%s/resume.Rmd", args[1])
resume_yaml <- readLines(resume_fname)
resume_yaml_idx <- which(resume_yaml == "---")
resume_yaml <- resume_yaml[c((resume_yaml_idx[1] + 1):(resume_yaml_idx[2] - 1))]
resume_yaml <- yaml::yaml.load(resume_yaml)

if (!is.null(resume_yaml$export_frame)) {
    rmarkdown::render(
        input=resume_fname,
        output_file=resume_yaml$export_frame,
        output_dir=sprintf("%s/outputs", args[1])
    )
}

if (resume_yaml$to_index) {
    rmarkdown::render(
        input=resume_fname,
        output_file="index.html",
        output_dir=args[1]
    )
}
